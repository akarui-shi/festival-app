package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.EventCategory;
import com.festivalapp.backend.entity.EventCategoryId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EventCategoryRepository extends JpaRepository<EventCategory, EventCategoryId> {
}
