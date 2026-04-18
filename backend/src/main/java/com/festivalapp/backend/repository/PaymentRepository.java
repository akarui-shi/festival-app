package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.Payment;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    @EntityGraph(attributePaths = {"order", "order.user", "order.event"})
    Optional<Payment> findByExternalPaymentId(String externalPaymentId);

    @EntityGraph(attributePaths = {"order", "order.user", "order.event"})
    Optional<Payment> findFirstByOrderIdOrderByCreatedAtDesc(Long orderId);
}
