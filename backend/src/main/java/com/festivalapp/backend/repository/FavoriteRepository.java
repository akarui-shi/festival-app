package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.Favorite;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FavoriteRepository extends JpaRepository<Favorite, Long> {

    boolean existsByUserIdAndEventId(Long userId, Long eventId);

    @EntityGraph(attributePaths = {"event"})
    List<Favorite> findByUserIdOrderByIdDesc(Long userId);

    Optional<Favorite> findByUserIdAndEventId(Long userId, Long eventId);
}
