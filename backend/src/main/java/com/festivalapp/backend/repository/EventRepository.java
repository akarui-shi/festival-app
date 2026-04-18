package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.Event;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EventRepository extends JpaRepository<Event, Long> {

    @EntityGraph(attributePaths = {"organization", "organization.city", "createdByUser", "city"})
    List<Event> findAllByDeletedAtIsNullOrderByCreatedAtDesc();

    @EntityGraph(attributePaths = {"organization", "organization.city", "createdByUser", "city"})
    List<Event> findAllByOrganizationIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long organizationId);

    @EntityGraph(attributePaths = {"organization", "organization.city", "createdByUser", "city"})
    List<Event> findAllByCreatedByUserIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long userId);

    @EntityGraph(attributePaths = {"organization", "organization.city", "createdByUser", "city"})
    Optional<Event> findByIdAndDeletedAtIsNull(Long id);
}
