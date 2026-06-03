package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.Event;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
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

    @Query(value = """
        SELECT DISTINCT e.*
        FROM events e
        WHERE e.deleted_at IS NULL
          AND e.status = :status
          AND (:cityId IS NULL OR e.city_id = :cityId)
          AND (:organizationId IS NULL OR e.organization_id = :organizationId)
          AND (:categoryId IS NULL OR EXISTS (
                SELECT 1
                FROM event_categories ec
                WHERE ec.event_id = e.id AND ec.category_id = :categoryId
          ))
          AND (:venueId IS NULL OR EXISTS (
                SELECT 1
                FROM sessions s
                WHERE s.event_id = e.id AND s.venue_id = :venueId
          ))
          AND (CAST(:dateStart AS timestamptz) IS NULL OR EXISTS (
                SELECT 1
                FROM sessions s
                WHERE s.event_id = e.id
                  AND s.starts_at >= :dateStart
                  AND s.starts_at < :dateEnd
          ))
          AND (CAST(:rangeStart AS timestamptz) IS NULL OR EXISTS (
                SELECT 1
                FROM sessions s
                WHERE s.event_id = e.id
                  AND s.starts_at >= :rangeStart
                  AND (CAST(:rangeEnd AS timestamptz) IS NULL OR s.starts_at < :rangeEnd)
          ))
          AND (:participationType IS NULL OR EXISTS (
                SELECT 1
                FROM sessions s
                WHERE s.event_id = e.id
                  AND (
                    (:participationType = 'free' AND EXISTS (
                        SELECT 1 FROM ticket_types tt
                        WHERE tt.session_id = s.id
                          AND tt.is_active = TRUE
                          AND tt.price <= 0
                    ))
                    OR
                    (:participationType = 'paid' AND EXISTS (
                        SELECT 1 FROM ticket_types tt
                        WHERE tt.session_id = s.id
                          AND tt.is_active = TRUE
                          AND tt.price > 0
                    ))
                  )
          ))
          AND (:priceFrom IS NULL OR :priceTo IS NULL OR EXISTS (
                SELECT 1
                FROM sessions s
                JOIN ticket_types tt ON tt.session_id = s.id AND tt.is_active = TRUE
                WHERE s.event_id = e.id
                  AND tt.price >= :priceFrom
                  AND tt.price <= :priceTo
          ))
          AND (:priceFrom IS NULL OR :priceTo IS NOT NULL OR EXISTS (
                SELECT 1
                FROM sessions s
                JOIN ticket_types tt ON tt.session_id = s.id AND tt.is_active = TRUE
                WHERE s.event_id = e.id
                  AND tt.price >= :priceFrom
          ))
          AND (:priceFrom IS NOT NULL OR :priceTo IS NULL OR EXISTS (
                SELECT 1
                FROM sessions s
                JOIN ticket_types tt ON tt.session_id = s.id AND tt.is_active = TRUE
                WHERE s.event_id = e.id
                  AND tt.price <= :priceTo
          ))
          AND (:registrationOpen IS NULL OR EXISTS (
                SELECT 1
                FROM sessions s
                JOIN ticket_types tt ON tt.session_id = s.id AND tt.is_active = TRUE
                WHERE s.event_id = e.id
                  AND (:now >= COALESCE(tt.sales_start_at, :now))
                  AND (:now <= COALESCE(tt.sales_end_at, :now))
                  AND (
                    s.seat_limit IS NULL OR
                    (
                      SELECT COUNT(*)
                      FROM tickets t
                      WHERE t.session_id = s.id AND t.status = 'активен'
                    ) < s.seat_limit
                  )
          ) = :registrationOpen)
          AND (:searchQuery IS NULL OR (
                to_tsvector(
                  'russian',
                  coalesce(e.title, '') || ' ' ||
                  coalesce(e.short_description, '') || ' ' ||
                  coalesce(e.full_description, '')
                ) @@ plainto_tsquery('russian', :searchQuery)
                OR lower(coalesce(e.title, '')) LIKE concat('%', lower(:searchQuery), '%')
                OR lower(coalesce(e.short_description, '')) LIKE concat('%', lower(:searchQuery), '%')
                OR lower(coalesce(e.full_description, '')) LIKE concat('%', lower(:searchQuery), '%')
                OR EXISTS (
                    SELECT 1
                    FROM organizations o
                    WHERE o.id = e.organization_id
                      AND (
                        to_tsvector('russian', coalesce(o.name, '')) @@ plainto_tsquery('russian', :searchQuery)
                        OR lower(coalesce(o.name, '')) LIKE concat('%', lower(:searchQuery), '%')
                      )
                )
                OR EXISTS (
                    SELECT 1
                    FROM event_participants ep
                    JOIN participants p ON p.id = ep.participant_id
                    WHERE ep.event_id = e.id
                      AND p.deleted_at IS NULL
                      AND (
                        to_tsvector(
                          'russian',
                          coalesce(p.name, '') || ' ' ||
                          coalesce(p.stage_name, '') || ' ' ||
                          coalesce(p.genre, '')
                        ) @@ plainto_tsquery('russian', :searchQuery)
                        OR lower(coalesce(p.name, '')) LIKE concat('%', lower(:searchQuery), '%')
                        OR lower(coalesce(p.stage_name, '')) LIKE concat('%', lower(:searchQuery), '%')
                        OR lower(coalesce(p.genre, '')) LIKE concat('%', lower(:searchQuery), '%')
                      )
                )
          ))
        ORDER BY e.created_at DESC
        """, nativeQuery = true)
    List<Event> searchCatalog(
        @Param("searchQuery") String searchQuery,
        @Param("categoryId") Long categoryId,
        @Param("venueId") Long venueId,
        @Param("cityId") Long cityId,
        @Param("organizationId") Long organizationId,
        @Param("dateStart") OffsetDateTime dateStart,
        @Param("dateEnd") OffsetDateTime dateEnd,
        @Param("rangeStart") OffsetDateTime rangeStart,
        @Param("rangeEnd") OffsetDateTime rangeEnd,
        @Param("participationType") String participationType,
        @Param("priceFrom") BigDecimal priceFrom,
        @Param("priceTo") BigDecimal priceTo,
        @Param("registrationOpen") Boolean registrationOpen,
        @Param("status") String status,
        @Param("now") OffsetDateTime now
    );
}
