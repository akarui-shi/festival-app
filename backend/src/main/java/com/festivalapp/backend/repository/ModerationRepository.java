package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.Moderation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ModerationRepository extends JpaRepository<Moderation, Long> {

    List<Moderation> findAllByOrderByDecidedAtDesc();
}
