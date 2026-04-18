package com.festivalapp.backend.service;

import com.festivalapp.backend.dto.TicketResponse;
import com.festivalapp.backend.entity.Order;
import com.festivalapp.backend.entity.Payment;
import com.festivalapp.backend.entity.RoleName;
import com.festivalapp.backend.entity.Ticket;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.exception.BadRequestException;
import com.festivalapp.backend.exception.ResourceNotFoundException;
import com.festivalapp.backend.repository.OrderRepository;
import com.festivalapp.backend.repository.PaymentRepository;
import com.festivalapp.backend.repository.TicketRepository;
import com.festivalapp.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TicketService {

    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
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

    private TicketResponse toResponse(Ticket ticket) {
        return TicketResponse.builder()
            .ticketId(ticket.getId())
            .orderId(ticket.getOrderItem() == null || ticket.getOrderItem().getOrder() == null ? null : ticket.getOrderItem().getOrder().getId())
            .eventId(ticket.getSession() == null || ticket.getSession().getEvent() == null ? null : ticket.getSession().getEvent().getId())
            .eventTitle(ticket.getSession() == null || ticket.getSession().getEvent() == null ? null : ticket.getSession().getEvent().getTitle())
            .sessionId(ticket.getSession() == null ? null : ticket.getSession().getId())
            .sessionTitle(ticket.getSession() == null ? null : ticket.getSession().getSessionTitle())
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

    private User resolveActor(String actorIdentifier) {
        return userRepository.findByLoginOrEmailWithRoles(actorIdentifier)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
