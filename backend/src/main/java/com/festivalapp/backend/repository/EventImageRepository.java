package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.EventImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

public interface EventImageRepository extends JpaRepository<EventImage, Long> {

    @Transactional
    void deleteByEventId(Long eventId);
}
