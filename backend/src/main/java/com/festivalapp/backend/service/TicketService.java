package com.festivalapp.backend.service;

import com.festivalapp.backend.dto.TicketResponse;
import com.festivalapp.backend.entity.Order;
import com.festivalapp.backend.entity.OrderItem;
import com.festivalapp.backend.entity.Payment;
import com.festivalapp.backend.entity.RoleName;
import com.festivalapp.backend.entity.Ticket;
import com.festivalapp.backend.entity.TicketType;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.exception.BadRequestException;
import com.festivalapp.backend.exception.ResourceNotFoundException;
import com.festivalapp.backend.repository.OrderItemRepository;
import com.festivalapp.backend.repository.OrderRepository;
import com.festivalapp.backend.repository.PaymentRepository;
import com.festivalapp.backend.repository.TicketRepository;
import com.festivalapp.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TicketService {

    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final PaymentRepository paymentRepository;

    @Transactional(readOnly = true)
    public List<TicketResponse> getMyTickets(String actorIdentifier) {
        User actor = resolveActor(actorIdentifier);
        List<TicketResponse> responses = new ArrayList<>(ticketRepository.findAllByUserIdOrderByIssuedAtDesc(actor.getId()).stream()
            .map(this::toResponse)
            .toList());

        List<Order> pendingOrders = orderRepository.findAllByUserIdAndStatusOrderByCreatedAtDesc(actor.getId(), "ожидает_оплаты");
        for (Order order : pendingOrders) {
            Payment payment = paymentRepository.findFirstByOrderIdOrderByCreatedAtDesc(order.getId()).orElse(null);
            responses.add(TicketResponse.builder()
                .ticketId(-order.getId())
                .orderId(order.getId())
                .eventId(order.getEvent() == null ? null : order.getEvent().getId())
                .eventTitle(order.getEvent() == null ? null : order.getEvent().getTitle())
                .eventShortDescription(order.getEvent() == null ? null : order.getEvent().getShortDescription())
                .sessionId(null)
                .sessionTitle("Ожидает оплаты")
                .status("ожидает_оплаты")
                .qrToken(null)
                .issuedAt(order.getCreatedAt() == null ? null : order.getCreatedAt().toLocalDateTime())
                .usedAt(null)
                .requiresPayment(true)
                .paymentStatus(payment == null ? "pending" : payment.getStatus())
                .paymentUrl(payment != null && payment.getPayloadJson() != null && payment.getPayloadJson().has("paymentUrl")
                    ? payment.getPayloadJson().get("paymentUrl").asText(null)
                    : null)
                .build());
        }

        return responses;
    }

    @Transactional
    public TicketResponse useTicket(Long ticketId, String actorIdentifier) {
        User actor = resolveActor(actorIdentifier);
        if (!hasOrganizerOrAdminRole(actor)) {
            throw new BadRequestException("Недостаточно прав для отметки билета");
        }

        Ticket ticket = ticketRepository.findById(ticketId)
            .orElseThrow(() -> new ResourceNotFoundException("Ticket not found"));

        if ("возвращён".equals(ticket.getStatus())) {
            throw new BadRequestException("Возвращенный билет нельзя использовать");
        }

        ticket.setStatus("использован");
        ticket.setUsedAt(OffsetDateTime.now());
        return toResponse(ticketRepository.save(ticket));
    }

    @Transactional
    public TicketResponse refundTicket(Long ticketId, String actorIdentifier) {
        User actor = resolveActor(actorIdentifier);
        Ticket ticket = ticketRepository.findById(ticketId)
            .orElseThrow(() -> new ResourceNotFoundException("Ticket not found"));

        boolean ownTicket = ticket.getUser() != null
            && ticket.getUser().getId() != null
            && ticket.getUser().getId().equals(actor.getId());
        boolean admin = hasAdminRole(actor);
        if (!ownTicket && !admin) {
            throw new BadRequestException("Недостаточно прав для возврата билета");
        }

        if ("возвращён".equals(ticket.getStatus())) {
            return toResponse(ticket);
        }
        if ("использован".equals(ticket.getStatus())) {
            throw new BadRequestException("Использованный билет нельзя вернуть");
        }

        ticket.setStatus("возвращён");
        ticket.setUsedAt(OffsetDateTime.now());
        Ticket saved = ticketRepository.save(ticket);

        Long orderId = saved.getOrderItem() == null || saved.getOrderItem().getOrder() == null
            ? null
            : saved.getOrderItem().getOrder().getId();
        if (orderId != null) {
            long notReturnedCount = ticketRepository.countByOrderItemOrderIdAndStatusNot(orderId, "возвращён");
            if (notReturnedCount == 0) {
                orderRepository.findById(orderId).ifPresent(order -> {
                    order.setStatus("отменён");
                    order.setUpdatedAt(OffsetDateTime.now());
                    orderRepository.save(order);
                });
            }
        }

        return toResponse(saved);
    }

    private TicketResponse toResponse(Ticket ticket) {
        TicketType ticketType = ticket.getOrderItem() == null ? null : ticket.getOrderItem().getTicketType();
        BigDecimal unitPrice = ticket.getOrderItem() == null ? null : ticket.getOrderItem().getUnitPrice();
        BigDecimal paidAmount = null;
        if (ticket.getOrderItem() != null && ticket.getOrderItem().getOrder() != null) {
            Order order = ticket.getOrderItem().getOrder();
            BigDecimal orderTotal = order.getTotalAmount();
            if (orderTotal != null) {
                List<OrderItem> allItems = orderItemRepository.findAllByOrderId(order.getId());
                int totalTickets = allItems.stream().mapToInt(i -> i.getQuantity() == null ? 0 : i.getQuantity()).sum();
                if (totalTickets > 0) {
                    paidAmount = orderTotal.divide(BigDecimal.valueOf(totalTickets), 2, RoundingMode.HALF_UP);
                }
            }
        }
        return TicketResponse.builder()
            .ticketId(ticket.getId())
            .orderId(ticket.getOrderItem() == null || ticket.getOrderItem().getOrder() == null ? null : ticket.getOrderItem().getOrder().getId())
            .eventId(ticket.getSession() == null || ticket.getSession().getEvent() == null ? null : ticket.getSession().getEvent().getId())
            .eventTitle(ticket.getSession() == null || ticket.getSession().getEvent() == null ? null : ticket.getSession().getEvent().getTitle())
            .eventShortDescription(ticket.getSession() == null || ticket.getSession().getEvent() == null ? null : ticket.getSession().getEvent().getShortDescription())
            .sessionId(ticket.getSession() == null ? null : ticket.getSession().getId())
            .sessionTitle(ticket.getSession() == null ? null : ticket.getSession().getSessionTitle())
            .sessionStartsAt(ticket.getSession() == null || ticket.getSession().getStartsAt() == null ? null : ticket.getSession().getStartsAt().toLocalDateTime())
            .sessionEndsAt(ticket.getSession() == null || ticket.getSession().getEndsAt() == null ? null : ticket.getSession().getEndsAt().toLocalDateTime())
            .venueName(ticket.getSession() == null || ticket.getSession().getVenue() == null ? null : ticket.getSession().getVenue().getName())
            .venueAddress(ticket.getSession() == null || ticket.getSession().getVenue() == null ? null : ticket.getSession().getVenue().getAddress())
            .cityName(ticket.getSession() == null
                || ticket.getSession().getVenue() == null
                || ticket.getSession().getVenue().getCity() == null
                ? null
                : ticket.getSession().getVenue().getCity().getName())
            .ticketTypeName(ticketType == null ? null : ticketType.getName())
            .ticketPrice(unitPrice)
            .paidAmount(paidAmount)
            .ticketCurrency(ticketType == null ? null : ticketType.getCurrency())
            .holderName(resolveHolderName(ticket.getUser()))
            .status(ticket.getStatus())
            .qrToken(ticket.getQrToken())
            .issuedAt(ticket.getIssuedAt() == null ? null : ticket.getIssuedAt().toLocalDateTime())
            .usedAt(ticket.getUsedAt() == null ? null : ticket.getUsedAt().toLocalDateTime())
            .requiresPayment(false)
            .paymentStatus("succeeded")
            .paymentUrl(null)
            .build();
    }

    private boolean hasOrganizerOrAdminRole(User user) {
        return user.getUserRoles().stream().anyMatch(userRole -> {
            RoleName roleName = userRole.getRole().toRoleName();
            return roleName == RoleName.ROLE_ORGANIZER || roleName == RoleName.ROLE_ADMIN;
        });
    }

    private boolean hasAdminRole(User user) {
        return user.getUserRoles().stream()
            .anyMatch(userRole -> userRole.getRole().toRoleName() == RoleName.ROLE_ADMIN);
    }

    private String resolveHolderName(User user) {
        if (user == null) {
            return null;
        }

        String fullName = (user.getFirstName() + " " + user.getLastName()).trim();
        if (StringUtils.hasText(fullName)) {
            return fullName;
        }
        if (StringUtils.hasText(user.getLogin())) {
            return user.getLogin();
        }
        if (StringUtils.hasText(user.getEmail())) {
            return user.getEmail();
        }
        return null;
    }

    private User resolveActor(String actorIdentifier) {
        return userRepository.findByLoginOrEmailWithRoles(actorIdentifier)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
