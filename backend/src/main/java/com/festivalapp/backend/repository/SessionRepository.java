package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.Session;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

public interface SessionRepository extends JpaRepository<Session, Long> {

    @EntityGraph(attributePaths = {"event", "event.organization", "event.city", "venue", "venue.city"})
    List<Session> findAllByEventIdOrderByStartsAtAsc(Long eventId);

    @EntityGraph(attributePaths = {"event", "event.organization", "event.city", "venue", "venue.city"})
    List<Session> findAllByStartsAtBetweenOrderByStartsAtAsc(OffsetDateTime from, OffsetDateTime to);

    @EntityGraph(attributePaths = {"event", "event.organization", "event.city", "venue", "venue.city"})
    Optional<Session> findById(Long id);

    @EntityGraph(attributePaths = {"event", "event.organization", "event.city", "venue", "venue.city"})
    List<Session> findAllByOrderByStartsAtAsc();
}
