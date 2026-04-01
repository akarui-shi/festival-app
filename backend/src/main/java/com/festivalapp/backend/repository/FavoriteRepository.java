package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.Favorite;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface FavoriteRepository extends JpaRepository<Favorite, Long> {

    boolean existsByUserIdAndEventId(Long userId, Long eventId);

    @EntityGraph(attributePaths = {"event"})
    List<Favorite> findByUserIdOrderByIdDesc(Long userId);

    Optional<Favorite> findByUserIdAndEventId(Long userId, Long eventId);

    @Modifying
    @Query("delete from Favorite f where f.event.id = :eventId")
    void deleteByEventId(@Param("eventId") Long eventId);
}
