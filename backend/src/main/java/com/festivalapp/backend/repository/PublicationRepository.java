package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.Publication;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PublicationRepository extends JpaRepository<Publication, Long> {

    @EntityGraph(attributePaths = {"event", "event.organization", "organization", "createdByUser"})
    List<Publication> findAllByOrderByCreatedAtDesc();

    @EntityGraph(attributePaths = {"event", "event.organization", "organization", "createdByUser"})
    List<Publication> findAllByCreatedByUserIdOrderByCreatedAtDesc(Long createdByUserId);

    @EntityGraph(attributePaths = {"event", "event.organization", "organization", "createdByUser"})
    List<Publication> findAllByEventIdOrderByCreatedAtDesc(Long eventId);

    @EntityGraph(attributePaths = {"event", "event.organization", "organization", "createdByUser"})
    List<Publication> findAllByOrganizationIdOrderByCreatedAtDesc(Long organizationId);

    @EntityGraph(attributePaths = {"event", "event.organization", "organization", "createdByUser"})
    Optional<Publication> findById(Long id);
}
