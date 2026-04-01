package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.Event;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;
import java.util.Optional;

public interface EventRepository extends JpaRepository<Event, Long>, JpaSpecificationExecutor<Event> {

    @EntityGraph(attributePaths = {"organizer", "categories", "venue", "venue.city"})
    List<Event> findAll(Specification<Event> specification, Sort sort);

    @EntityGraph(attributePaths = {"organizer", "categories", "venue", "venue.city", "sessions", "sessions.venue", "sessions.venue.city"})
    @Query("select e from Event e where e.id = :id")
    Optional<Event> findDetailedById(@Param("id") Long id);

    @EntityGraph(attributePaths = {"organizer", "categories", "venue", "venue.city"})
    List<Event> findAllByOrganizerId(Long organizerId, Sort sort);
}
