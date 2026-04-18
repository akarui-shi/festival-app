package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.EventImage;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EventImageRepository extends JpaRepository<EventImage, Long> {

    @EntityGraph(attributePaths = {"image"})
    List<EventImage> findAllByEventIdOrderBySortOrderAscIdAsc(Long eventId);

    @EntityGraph(attributePaths = {"image"})
    Optional<EventImage> findFirstByEventIdAndPrimaryIsTrueOrderBySortOrderAscIdAsc(Long eventId);

    void deleteByEventId(Long eventId);
}
