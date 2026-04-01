package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.EventCategory;
import com.festivalapp.backend.entity.EventCategoryId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EventCategoryRepository extends JpaRepository<EventCategory, EventCategoryId> {

    @Modifying
    @Query(value = "delete from event_categories where event_id = :eventId", nativeQuery = true)
    void deleteByEventId(@Param("eventId") Long eventId);
}
