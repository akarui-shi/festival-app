package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.EventCategory;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EventCategoryRepository extends JpaRepository<EventCategory, Long> {

    @EntityGraph(attributePaths = {"category"})
    List<EventCategory> findAllByEventId(Long eventId);

    void deleteByEventId(Long eventId);
}
