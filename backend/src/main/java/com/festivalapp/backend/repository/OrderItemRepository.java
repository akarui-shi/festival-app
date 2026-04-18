package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.OrderItem;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {

    @EntityGraph(attributePaths = {"order", "ticketType", "ticketType.session", "ticketType.session.venue", "ticketType.session.event"})
    List<OrderItem> findAllByOrderId(Long orderId);
}
