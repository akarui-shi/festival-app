package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.Moderation;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ModerationRepository extends JpaRepository<Moderation, Long> {
}
