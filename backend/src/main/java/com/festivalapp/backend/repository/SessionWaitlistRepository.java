package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.SessionWaitlist;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SessionWaitlistRepository extends JpaRepository<SessionWaitlist, Long> {

    Optional<SessionWaitlist> findBySessionIdAndUserId(Long sessionId, Long userId);

    boolean existsBySessionIdAndUserId(Long sessionId, Long userId);

    long countBySessionIdAndStatus(Long sessionId, String status);

    @EntityGraph(attributePaths = {"user", "session", "session.event"})
    List<SessionWaitlist> findAllBySessionIdAndStatusOrderByCreatedAtAsc(Long sessionId, String status);

    List<SessionWaitlist> findAllByUserIdOrderByCreatedAtDesc(Long userId);
}
