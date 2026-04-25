package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.Ticket;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;

public interface TicketRepository extends JpaRepository<Ticket, Long> {

    @EntityGraph(attributePaths = {"orderItem", "orderItem.order", "orderItem.ticketType", "session", "session.venue", "session.event", "user"})
    List<Ticket> findAllByUserIdOrderByIssuedAtDesc(Long userId);

    @EntityGraph(attributePaths = {"orderItem", "orderItem.order", "orderItem.ticketType", "session", "session.venue", "session.event", "user"})
    List<Ticket> findAllBySessionIdOrderByIssuedAtDesc(Long sessionId);

    @EntityGraph(attributePaths = {"orderItem", "orderItem.order", "orderItem.ticketType", "session", "session.venue", "session.event", "user"})
    List<Ticket> findAllByOrderItemId(Long orderItemId);

    long countBySessionIdAndStatus(Long sessionId, String status);

    long countBySessionIdAndOrderItemTicketTypeIdAndStatus(Long sessionId, Long ticketTypeId, String status);

    long countByOrderItemOrderIdAndStatusNot(Long orderId, String status);

    @EntityGraph(attributePaths = {"user", "session", "session.event", "session.venue"})
    @Query("SELECT t FROM Ticket t WHERE t.session.startsAt BETWEEN :from AND :to AND t.status NOT IN ('cancelled', 'used', 'CANCELLED', 'USED')")
    List<Ticket> findActiveTicketsForSessionsStartingBetween(@Param("from") OffsetDateTime from,
                                                              @Param("to") OffsetDateTime to);
}
