package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.Event;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @EntityGraph(attributePaths = {"organization", "organization.city", "createdByUser", "city"})
    @Query("select e from Event e where e.id = :id and e.deletedAt is null")
    Optional<Event> findByIdForUpdate(@Param("id") Long id);
}
