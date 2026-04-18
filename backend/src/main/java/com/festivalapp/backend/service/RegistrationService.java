package com.festivalapp.backend.service;

import com.festivalapp.backend.dto.MyRegistrationResponse;
import com.festivalapp.backend.dto.RegistrationCreateRequest;
import com.festivalapp.backend.dto.RegistrationResponse;
import com.festivalapp.backend.entity.Order;
import com.festivalapp.backend.entity.OrderItem;
import com.festivalapp.backend.entity.Session;
import com.festivalapp.backend.entity.Ticket;
import com.festivalapp.backend.entity.TicketType;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.exception.BadRequestException;
import com.festivalapp.backend.exception.ResourceNotFoundException;
import com.festivalapp.backend.repository.OrderItemRepository;
import com.festivalapp.backend.repository.OrderRepository;
import com.festivalapp.backend.repository.SessionRepository;
import com.festivalapp.backend.repository.TicketRepository;
import com.festivalapp.backend.repository.TicketTypeRepository;
import com.festivalapp.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RegistrationService {

    private final UserRepository userRepository;
    private final SessionRepository sessionRepository;
    private final TicketTypeRepository ticketTypeRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final TicketRepository ticketRepository;

    @Transactional
    public RegistrationResponse create(RegistrationCreateRequest request, String actorIdentifier) {
        User actor = resolveActor(actorIdentifier);
        Session session = sessionRepository.findById(request.getSessionId())
            .orElseThrow(() -> new ResourceNotFoundException("Session not found"));

        int requested = request.getQuantity();
        if (requested <= 0) {
            throw new BadRequestException("Quantity must be positive");
        }

        long occupied = ticketRepository.countBySessionIdAndStatus(session.getId(), "активен");
        int capacity = session.getSeatLimit() == null ? Integer.MAX_VALUE : session.getSeatLimit();
        if (occupied + requested > capacity) {
            throw new BadRequestException("Недостаточно свободных мест");
        }

        TicketType ticketType = ticketTypeRepository.findFirstBySessionIdAndActiveIsTrueOrderByIdAsc(session.getId())
            .orElseGet(() -> ticketTypeRepository.save(TicketType.builder()
                .session(session)
                .name("Стандарт")
                .price(BigDecimal.ZERO)
                .currency("RUB")
                .quota(capacity)
                .active(true)
                .build()));

        OffsetDateTime now = OffsetDateTime.now();

        Order order = orderRepository.save(Order.builder()
            .user(actor)
            .event(session.getEvent())
            .status("завершён")
            .totalAmount(ticketType.getPrice().multiply(BigDecimal.valueOf(requested)))
            .currency(ticketType.getCurrency())
            .createdAt(now)
            .updatedAt(now)
            .build());

        OrderItem orderItem = orderItemRepository.save(OrderItem.builder()
            .order(order)
            .ticketType(ticketType)
            .quantity(requested)
            .unitPrice(ticketType.getPrice())
            .lineTotal(ticketType.getPrice().multiply(BigDecimal.valueOf(requested)))
            .build());

        List<Ticket> createdTickets = new ArrayList<>();
        for (int i = 0; i < requested; i++) {
            createdTickets.add(ticketRepository.save(Ticket.builder()
                .orderItem(orderItem)
                .user(actor)
                .session(session)
                .status("активен")
                .qrToken(UUID.randomUUID().toString())
                .issuedAt(now)
                .build()));
        }

        String qrToken = createdTickets.isEmpty() ? null : createdTickets.get(0).getQrToken();

        return RegistrationResponse.builder()
            .registrationId(order.getId())
            .sessionId(session.getId())
            .eventId(session.getEvent() == null ? null : session.getEvent().getId())
            .eventTitle(session.getEvent() == null ? null : session.getEvent().getTitle())
            .sessionTitle(session.getSessionTitle())
            .venueName(session.getVenue() == null ? null : session.getVenue().getName())
            .startAt(session.getStartsAt() == null ? null : session.getStartsAt().toLocalDateTime())
            .quantity(requested)
            .status(com.festivalapp.backend.entity.RegistrationStatus.CREATED)
            .qrToken(qrToken)
            .createdAt(now.toLocalDateTime())
            .build();
    }

    @Transactional(readOnly = true)
    public List<MyRegistrationResponse> getMyRegistrations(String actorIdentifier) {
        User actor = resolveActor(actorIdentifier);

        Map<Long, Ticket> firstTicketByOrderId = new LinkedHashMap<>();
        for (Ticket ticket : ticketRepository.findAllByUserIdOrderByIssuedAtDesc(actor.getId())) {
            if (ticket.getOrderItem() == null || ticket.getOrderItem().getOrder() == null) {
                continue;
            }
            Long orderId = ticket.getOrderItem().getOrder().getId();
            firstTicketByOrderId.putIfAbsent(orderId, ticket);
        }

        return firstTicketByOrderId.values().stream()
            .map(ticket -> {
                Session session = ticket.getSession();
                OrderItem item = ticket.getOrderItem();
                return MyRegistrationResponse.builder()
                    .registrationId(item.getOrder().getId())
                    .sessionId(session == null ? null : session.getId())
                    .eventId(session == null || session.getEvent() == null ? null : session.getEvent().getId())
                    .eventTitle(session == null || session.getEvent() == null ? null : session.getEvent().getTitle())
                    .sessionTitle(session == null ? null : session.getSessionTitle())
                    .venueName(session == null || session.getVenue() == null ? null : session.getVenue().getName())
                    .startAt(session == null || session.getStartsAt() == null ? null : session.getStartsAt().toLocalDateTime())
                    .quantity(item == null ? 1 : item.getQuantity())
                    .status(DomainStatusMapper.toRegistrationStatus(ticket.getStatus()))
                    .qrToken(ticket.getQrToken())
                    .createdAt(ticket.getIssuedAt() == null ? null : ticket.getIssuedAt().toLocalDateTime())
                    .build();
            })
            .toList();
    }

    @Transactional
    public Map<String, Object> cancelRegistration(Long id, String actorIdentifier) {
        User actor = resolveActor(actorIdentifier);
        Order order = orderRepository.findByIdAndUserId(id, actor.getId())
            .orElseThrow(() -> new ResourceNotFoundException("Registration not found"));

        List<OrderItem> items = orderItemRepository.findAllByOrderId(order.getId());
        for (OrderItem item : items) {
            List<Ticket> tickets = ticketRepository.findAllByOrderItemId(item.getId());
            for (Ticket ticket : tickets) {
                ticket.setStatus("возвращён");
                ticket.setUsedAt(OffsetDateTime.now());
                ticketRepository.save(ticket);
            }
        }

        order.setStatus("отменён");
        order.setUpdatedAt(OffsetDateTime.now().withOffsetSameInstant(ZoneOffset.UTC));
        orderRepository.save(order);

        return Map.of("success", true);
    }

    private User resolveActor(String actorIdentifier) {
        return userRepository.findByLoginOrEmailWithRoles(actorIdentifier)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
