package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.EventCategory;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface EventCategoryRepository extends JpaRepository<EventCategory, Long> {

    @EntityGraph(attributePaths = {"category"})
    List<EventCategory> findAllByEventId(Long eventId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from EventCategory ec where ec.event.id = :eventId")
    void deleteByEventId(@Param("eventId") Long eventId);
}
