package com.festivalapp.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.festivalapp.backend.dto.OrderCreateRequest;
import com.festivalapp.backend.dto.OrderItemCreateRequest;
import com.festivalapp.backend.dto.OrderItemResponse;
import com.festivalapp.backend.dto.OrderResponse;
import com.festivalapp.backend.dto.OrderTicketResponse;
import com.festivalapp.backend.dto.PaymentConfirmRequest;
import com.festivalapp.backend.entity.Order;
import com.festivalapp.backend.entity.OrderItem;
import com.festivalapp.backend.entity.Payment;
import com.festivalapp.backend.entity.EventStatus;
import com.festivalapp.backend.entity.RoleName;
import com.festivalapp.backend.entity.Session;
import com.festivalapp.backend.entity.Ticket;
import com.festivalapp.backend.entity.TicketType;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.exception.BadRequestException;
import com.festivalapp.backend.exception.ResourceNotFoundException;
import com.festivalapp.backend.repository.OrderItemRepository;
import com.festivalapp.backend.repository.OrderRepository;
import com.festivalapp.backend.repository.PaymentRepository;
import com.festivalapp.backend.repository.SessionRepository;
import com.festivalapp.backend.repository.TicketRepository;
import com.festivalapp.backend.repository.TicketTypeRepository;
import com.festivalapp.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final TicketRepository ticketRepository;
    private final TicketTypeRepository ticketTypeRepository;
    private final SessionRepository sessionRepository;
    private final UserRepository userRepository;
    private final PaymentRepository paymentRepository;
    private final PaymentGatewayService paymentGatewayService;
    private final NotificationService notificationService;
    private final WaitlistService waitlistService;
    private final ObjectMapper objectMapper;

    @Transactional
    public OrderResponse createOrder(OrderCreateRequest request, String actorIdentifier) {
        User actor = resolveActor(actorIdentifier);
        Session session = sessionRepository.findById(request.getSessionId())
            .orElseThrow(() -> new ResourceNotFoundException("Session not found"));
        if (session.getEvent() == null || DomainStatusMapper.toEventStatus(session.getEvent().getStatus()) != EventStatus.PUBLISHED) {
            throw new BadRequestException("Регистрация доступна только для опубликованных мероприятий");
        }

        List<OrderItemCreateRequest> requestItems = normalizeItems(request, session);
        int requestedTotal = requestItems.stream().mapToInt(OrderItemCreateRequest::getQuantity).sum();
        long activeTickets = ticketRepository.countBySessionIdAndStatus(session.getId(), "активен");
        int seatLimit = session.getSeatLimit() == null ? Integer.MAX_VALUE : session.getSeatLimit();
        if (activeTickets + requestedTotal > seatLimit) {
            throw new BadRequestException("Недостаточно свободных мест");
        }

        OffsetDateTime now = OffsetDateTime.now();
        String currency = request.getCurrency() == null ? "RUB" : request.getCurrency();
        Map<Long, TicketType> ticketTypesById = new LinkedHashMap<>();
        Map<Long, Integer> requestedByType = new LinkedHashMap<>();

        for (OrderItemCreateRequest itemRequest : requestItems) {
            TicketType ticketType = ticketTypeRepository.findById(itemRequest.getTicketTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("Ticket type not found"));
            if (!ticketType.getSession().getId().equals(session.getId())) {
                throw new BadRequestException("Ticket type does not belong to session");
            }
            if (!ticketType.isActive()) {
                throw new BadRequestException("Ticket type is inactive");
            }
            validateSalesWindow(ticketType, now);

            ticketTypesById.put(ticketType.getId(), ticketType);
            requestedByType.merge(ticketType.getId(), itemRequest.getQuantity(), Integer::sum);
        }

        for (Map.Entry<Long, Integer> requestedEntry : requestedByType.entrySet()) {
            TicketType ticketType = ticketTypesById.get(requestedEntry.getKey());
            if (ticketType == null) {
                throw new BadRequestException("Ticket type not found");
            }
            int quota = ticketType.getQuota() == null ? Integer.MAX_VALUE : ticketType.getQuota();
            long soldForType = ticketRepository.countBySessionIdAndOrderItemTicketTypeIdAndStatus(session.getId(), ticketType.getId(), "активен");
            if (soldForType + requestedEntry.getValue() > quota) {
                throw new BadRequestException("Недостаточно билетов типа \"" + ticketType.getName() + "\"");
            }
        }

        Order order = orderRepository.save(Order.builder()
            .user(actor)
            .event(session.getEvent())
            .status("ожидает_оплаты")
            .totalAmount(BigDecimal.ZERO)
            .currency(currency)
            .createdAt(now)
            .updatedAt(now)
            .build());

        List<OrderItem> createdItems = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;

        for (OrderItemCreateRequest itemRequest : requestItems) {
            TicketType ticketType = ticketTypesById.get(itemRequest.getTicketTypeId());
            if (ticketType == null) {
                throw new BadRequestException("Ticket type not found");
            }

            BigDecimal unitPrice = ticketType.getPrice() == null ? BigDecimal.ZERO : ticketType.getPrice();
            BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(itemRequest.getQuantity()));
            total = total.add(lineTotal);

            OrderItem orderItem = orderItemRepository.save(OrderItem.builder()
                .order(order)
                .ticketType(ticketType)
                .quantity(itemRequest.getQuantity())
                .unitPrice(unitPrice)
                .lineTotal(lineTotal)
                .build());
            createdItems.add(orderItem);
        }

        boolean requiresPayment = total.compareTo(BigDecimal.ZERO) > 0;
        order.setStatus(requiresPayment ? "ожидает_оплаты" : "оплачен");
        order.setTotalAmount(total);
        order.setUpdatedAt(OffsetDateTime.now());
        orderRepository.save(order);

        Payment payment = null;
        if (requiresPayment) {
            PaymentGatewayService.PaymentCheckout checkout = paymentGatewayService.createCheckout(
                order,
                request.getPaymentProvider(),
                request.getSuccessUrl(),
                request.getCancelUrl()
            );

            payment = paymentRepository.save(Payment.builder()
                .order(order)
                .externalPaymentId(checkout.getExternalPaymentId())
                .provider(checkout.getProvider())
                .status(normalizePaymentStatus(checkout.getGatewayStatus()))
                .amount(total)
                .currency(currency)
                .createdAt(now)
                .payloadJson(buildPaymentPayloadJson(checkout))
                .build());
        } else {
            List<Ticket> issued = issueTickets(actor, session, createdItems, now);
            notificationService.notifyTicketIssued(actor, order, issued);
        }

        return toOrderResponse(order, createdItems, payment);
    }

    @Transactional
    public OrderResponse confirmPayment(Long orderId,
                                        PaymentConfirmRequest request,
                                        String actorIdentifier) {
        User actor = resolveActor(actorIdentifier);
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        boolean ownOrder = order.getUser() != null && order.getUser().getId().equals(actor.getId());
        boolean admin = actor.getUserRoles().stream().anyMatch(userRole -> userRole.getRole().toRoleName() == RoleName.ROLE_ADMIN);
        if (!ownOrder && !admin) {
            throw new BadRequestException("Недостаточно прав");
        }

        Payment payment;
        if (StringUtils.hasText(request.getExternalPaymentId())) {
            payment = paymentRepository.findByExternalPaymentId(request.getExternalPaymentId())
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found"));
        } else {
            payment = paymentRepository.findFirstByOrderIdOrderByCreatedAtDesc(order.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found"));
        }

        if (!payment.getOrder().getId().equals(order.getId())) {
            throw new BadRequestException("Payment does not belong to order");
        }

        if ("оплачен".equals(order.getStatus())) {
            return toOrderResponse(order, orderItemRepository.findAllByOrderId(order.getId()), payment);
        }

        String gatewayStatus = resolveGatewayStatus(payment, request);

        if (isPaymentPending(gatewayStatus)) {
            payment.setStatus("pending");
            paymentRepository.save(payment);
            return toOrderResponse(order, orderItemRepository.findAllByOrderId(order.getId()), payment);
        }

        if (!isPaymentSucceeded(gatewayStatus)) {
            order.setStatus("отменён");
            order.setUpdatedAt(OffsetDateTime.now());
            orderRepository.save(order);

            payment.setStatus("cancelled");
            paymentRepository.save(payment);

            return toOrderResponse(order, orderItemRepository.findAllByOrderId(order.getId()), payment);
        }

        order.setStatus("оплачен");
        order.setUpdatedAt(OffsetDateTime.now());
        orderRepository.save(order);

        payment.setStatus("succeeded");
        paymentRepository.save(payment);

        List<OrderItem> items = orderItemRepository.findAllByOrderId(order.getId());
        List<Ticket> issued = issueTickets(order.getUser(), null, items, OffsetDateTime.now());
        notificationService.notifyTicketIssued(order.getUser(), order, issued);

        return toOrderResponse(order, items, payment);
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getMyOrders(String actorIdentifier) {
        User actor = resolveActor(actorIdentifier);
        return orderRepository.findAllByUserIdOrderByCreatedAtDesc(actor.getId()).stream()
            .map(order -> toOrderResponse(
                order,
                orderItemRepository.findAllByOrderId(order.getId()),
                paymentRepository.findFirstByOrderIdOrderByCreatedAtDesc(order.getId()).orElse(null)
            ))
            .toList();
    }

    @Transactional(readOnly = true)
    public OrderResponse getMyOrderById(Long orderId, String actorIdentifier) {
        User actor = resolveActor(actorIdentifier);
        Order order = orderRepository.findByIdAndUserId(orderId, actor.getId())
            .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        return toOrderResponse(
            order,
            orderItemRepository.findAllByOrderId(order.getId()),
            paymentRepository.findFirstByOrderIdOrderByCreatedAtDesc(order.getId()).orElse(null)
        );
    }

    @Transactional
    public Map<String, Object> cancelOrder(Long orderId, String actorIdentifier) {
        User actor = resolveActor(actorIdentifier);
        Order order = orderRepository.findByIdAndUserId(orderId, actor.getId())
            .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        if ("отменён".equals(order.getStatus())) {
            return Map.of("success", true, "status", order.getStatus());
        }

        List<OrderItem> items = orderItemRepository.findAllByOrderId(order.getId());
        Set<Long> affectedSessionIds = new java.util.HashSet<>();
        for (OrderItem item : items) {
            List<Ticket> tickets = ticketRepository.findAllByOrderItemId(item.getId());
            for (Ticket ticket : tickets) {
                if (!"возвращён".equals(ticket.getStatus())) {
                    ticket.setStatus("возвращён");
                    ticket.setUsedAt(OffsetDateTime.now());
                    ticketRepository.save(ticket);
                    if (ticket.getSession() != null) {
                        affectedSessionIds.add(ticket.getSession().getId());
                    }
                }
            }
        }
        affectedSessionIds.forEach(waitlistService::notifyFirstInQueue);

        paymentRepository.findFirstByOrderIdOrderByCreatedAtDesc(order.getId()).ifPresent(payment -> {
            if (!"succeeded".equalsIgnoreCase(payment.getStatus())) {
                payment.setStatus("cancelled");
                paymentRepository.save(payment);
            }
        });

        order.setStatus("отменён");
        order.setUpdatedAt(OffsetDateTime.now());
        orderRepository.save(order);
        return Map.of("success", true, "status", order.getStatus());
    }

    private List<OrderItemCreateRequest> normalizeItems(OrderCreateRequest request, Session session) {
        List<OrderItemCreateRequest> requestItems = request.getItems();
        if (requestItems == null || requestItems.isEmpty()) {
            TicketType defaultType = ticketTypeRepository.findFirstBySessionIdAndActiveIsTrueOrderByIdAsc(session.getId())
                .orElseThrow(() -> new BadRequestException("Для сеанса не настроены типы билетов"));

            OrderItemCreateRequest autoItem = new OrderItemCreateRequest();
            autoItem.setTicketTypeId(defaultType.getId());
            autoItem.setQuantity(1);
            requestItems = List.of(autoItem);
        }

        Map<Long, Integer> mergedByType = new LinkedHashMap<>();
        for (OrderItemCreateRequest item : requestItems) {
            if (item == null || item.getTicketTypeId() == null) {
                throw new BadRequestException("Не указан тип билета");
            }
            if (item.getQuantity() == null || item.getQuantity() <= 0) {
                throw new BadRequestException("Количество билетов должно быть больше 0");
            }
            mergedByType.merge(item.getTicketTypeId(), item.getQuantity(), Integer::sum);
        }

        return mergedByType.entrySet().stream()
            .map(entry -> {
                OrderItemCreateRequest normalized = new OrderItemCreateRequest();
                normalized.setTicketTypeId(entry.getKey());
                normalized.setQuantity(entry.getValue());
                return normalized;
            })
            .toList();
    }

    private void validateSalesWindow(TicketType ticketType, OffsetDateTime now) {
        if (ticketType.getSalesStartAt() != null && now.isBefore(ticketType.getSalesStartAt())) {
            throw new BadRequestException("Продажи по этому сеансу еще не открыты");
        }
        if (ticketType.getSalesEndAt() != null && now.isAfter(ticketType.getSalesEndAt())) {
            throw new BadRequestException("Период продаж по этому сеансу завершен");
        }
    }

    private List<Ticket> issueTickets(User actor, Session session, List<OrderItem> items, OffsetDateTime now) {
        List<Ticket> issued = new ArrayList<>();
        for (OrderItem item : items) {
            Session resolvedSession = session == null
                ? (item.getTicketType() == null ? null : item.getTicketType().getSession())
                : session;
            if (resolvedSession == null) {
                throw new BadRequestException("Cannot resolve session for ticket issuance");
            }
            for (int i = 0; i < item.getQuantity(); i++) {
                Ticket ticket = ticketRepository.save(Ticket.builder()
                    .orderItem(item)
                    .user(actor)
                    .session(resolvedSession)
                    .status("активен")
                    .qrToken(UUID.randomUUID().toString())
                    .issuedAt(now)
                    .build());
                issued.add(ticket);
            }
        }
        return issued;
    }

    private com.fasterxml.jackson.databind.JsonNode buildPaymentPayloadJson(PaymentGatewayService.PaymentCheckout checkout) {
        if (checkout.getGatewayPayload() != null && checkout.getGatewayPayload().isObject()) {
            com.fasterxml.jackson.databind.node.ObjectNode payload = checkout.getGatewayPayload().deepCopy();
            payload.put("paymentUrl", checkout.getPaymentUrl());
            payload.put("successUrl", checkout.getSuccessUrl());
            payload.put("cancelUrl", checkout.getCancelUrl());
            return payload;
        }
        return objectMapper.valueToTree(Map.of(
            "paymentUrl", checkout.getPaymentUrl(),
            "successUrl", checkout.getSuccessUrl(),
            "cancelUrl", checkout.getCancelUrl()
        ));
    }

    private String resolveGatewayStatus(Payment payment, PaymentConfirmRequest request) {
        String provider = payment.getProvider();
        String externalPaymentId = StringUtils.hasText(request.getExternalPaymentId())
            ? request.getExternalPaymentId().trim()
            : payment.getExternalPaymentId();

        if (StringUtils.hasText(provider) && "yookassa".equalsIgnoreCase(provider)) {
            PaymentGatewayService.GatewayStatus gatewayStatus = paymentGatewayService.resolvePaymentStatus(provider, externalPaymentId);
            if (gatewayStatus.getPayload() != null) {
                payment.setPayloadJson(gatewayStatus.getPayload());
                paymentRepository.save(payment);
            }
            return normalizePaymentStatus(gatewayStatus.getStatus());
        }

        String fallbackStatus = StringUtils.hasText(request.getStatus()) ? request.getStatus().trim() : "succeeded";
        return normalizePaymentStatus(fallbackStatus);
    }

    private String normalizePaymentStatus(String status) {
        if (!StringUtils.hasText(status)) {
            return "pending";
        }
        return status.trim().toLowerCase();
    }

    private boolean isPaymentSucceeded(String status) {
        return "succeeded".equals(status) || "success".equals(status) || "paid".equals(status);
    }

    private boolean isPaymentPending(String status) {
        return "pending".equals(status) || "waiting_for_capture".equals(status) || "in_progress".equals(status);
    }

    private OrderResponse toOrderResponse(Order order, List<OrderItem> items, Payment payment) {
        List<OrderItemResponse> itemResponses = items.stream()
            .map(item -> {
                List<OrderTicketResponse> tickets = ticketRepository.findAllByOrderItemId(item.getId()).stream()
                    .map(ticket -> OrderTicketResponse.builder()
                        .ticketId(ticket.getId())
                        .sessionId(ticket.getSession() == null ? null : ticket.getSession().getId())
                        .status(ticket.getStatus())
                        .qrToken(ticket.getQrToken())
                        .issuedAt(ticket.getIssuedAt() == null ? null : ticket.getIssuedAt().toLocalDateTime())
                        .usedAt(ticket.getUsedAt() == null ? null : ticket.getUsedAt().toLocalDateTime())
                        .build())
                    .toList();

                return OrderItemResponse.builder()
                    .itemId(item.getId())
                    .ticketTypeId(item.getTicketType() == null ? null : item.getTicketType().getId())
                    .ticketTypeName(item.getTicketType() == null ? null : item.getTicketType().getName())
                    .quantity(item.getQuantity())
                    .unitPrice(item.getUnitPrice())
                    .lineTotal(item.getLineTotal())
                    .tickets(tickets)
                    .build();
            })
            .toList();

        String paymentUrl = null;
        String paymentStatus = null;
        String paymentProvider = null;
        if (payment != null) {
            paymentStatus = payment.getStatus();
            paymentProvider = payment.getProvider();
            if (payment.getPayloadJson() != null && payment.getPayloadJson().has("paymentUrl")) {
                paymentUrl = payment.getPayloadJson().get("paymentUrl").asText(null);
            }
        }

        return OrderResponse.builder()
            .orderId(order.getId())
            .eventId(order.getEvent() == null ? null : order.getEvent().getId())
            .eventTitle(order.getEvent() == null ? null : order.getEvent().getTitle())
            .status(order.getStatus())
            .totalAmount(order.getTotalAmount())
            .currency(order.getCurrency())
            .createdAt(order.getCreatedAt() == null ? null : order.getCreatedAt().toLocalDateTime())
            .updatedAt(order.getUpdatedAt() == null ? null : order.getUpdatedAt().toLocalDateTime())
            .requiresPayment("ожидает_оплаты".equals(order.getStatus()))
            .paymentStatus(paymentStatus)
            .paymentProvider(paymentProvider)
            .paymentUrl(paymentUrl)
            .items(itemResponses)
            .build();
    }

    private User resolveActor(String actorIdentifier) {
        return userRepository.findByLoginOrEmailWithRoles(actorIdentifier)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
