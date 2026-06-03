package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.Favorite;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

public interface FavoriteRepository extends JpaRepository<Favorite, Long> {

    boolean existsByUserIdAndEventId(Long userId, Long eventId);

    @EntityGraph(attributePaths = {"event", "event.organization", "event.city"})
    List<Favorite> findAllByUserIdOrderByCreatedAtDesc(Long userId);

    Optional<Favorite> findByUserIdAndEventId(Long userId, Long eventId);

    void deleteByUserIdAndEventId(Long userId, Long eventId);

    long countByEventId(Long eventId);

    @Query("SELECT f.event.id, COUNT(f) FROM Favorite f WHERE f.event.id IN :eventIds GROUP BY f.event.id")
    List<Object[]> countByEventIdIn(@Param("eventIds") Collection<Long> eventIds);

    default Map<Long, Long> countsByEventIds(Collection<Long> eventIds) {
        if (eventIds == null || eventIds.isEmpty()) return Map.of();
        return countByEventIdIn(eventIds).stream()
            .collect(Collectors.toMap(r -> (Long) r[0], r -> (Long) r[1]));
    }
}
