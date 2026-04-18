package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.Order;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {

    @EntityGraph(attributePaths = {"event", "event.organization", "event.city", "user"})
    List<Order> findAllByUserIdOrderByCreatedAtDesc(Long userId);

    @EntityGraph(attributePaths = {"event", "event.organization", "event.city", "user"})
    Optional<Order> findByIdAndUserId(Long id, Long userId);

    long countByEventIdAndStatus(Long eventId, String status);
}
