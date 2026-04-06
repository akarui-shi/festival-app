package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.Session;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface SessionRepository extends JpaRepository<Session, Long>, JpaSpecificationExecutor<Session> {

    @EntityGraph(attributePaths = {"event", "event.organizer", "event.venue", "event.venue.city"})
    List<Session> findAll(Specification<Session> specification, Sort sort);

    @EntityGraph(attributePaths = {"event", "event.organizer", "event.venue", "event.venue.city"})
    @Query("select s from Session s where s.id = :id")
    Optional<Session> findDetailedById(@Param("id") Long id);

    @Query("""
        select (count(s) > 0) from Session s
        where s.event.venue.id = :venueId
          and (:excludeSessionId is null or s.id <> :excludeSessionId)
          and s.startTime < :endAt
          and s.endTime > :startAt
        """)
    boolean existsOverlappingSession(@Param("venueId") Long venueId,
                                     @Param("startAt") LocalDateTime startAt,
                                     @Param("endAt") LocalDateTime endAt,
                                     @Param("excludeSessionId") Long excludeSessionId);

    @Modifying
    @Query("delete from Session s where s.event.id = :eventId")
    void deleteByEventId(@Param("eventId") Long eventId);
}
