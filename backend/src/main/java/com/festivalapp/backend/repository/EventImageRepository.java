package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.EventImage;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface EventImageRepository extends JpaRepository<EventImage, Long> {

    @EntityGraph(attributePaths = {"image"})
    List<EventImage> findAllByEventIdOrderBySortOrderAscIdAsc(Long eventId);

    @EntityGraph(attributePaths = {"image"})
    Optional<EventImage> findFirstByEventIdAndPrimaryIsTrueOrderBySortOrderAscIdAsc(Long eventId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from EventImage ei where ei.event.id = :eventId")
    void deleteByEventId(@Param("eventId") Long eventId);
}
