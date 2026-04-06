package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.Review;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    @EntityGraph(attributePaths = {"user", "event"})
    List<Review> findByEventIdOrderByCreatedAtDesc(Long eventId);

    boolean existsByUserIdAndEventId(Long userId, Long eventId);

    @EntityGraph(attributePaths = {"user", "event"})
    Optional<Review> findWithUserAndEventById(Long id);

    long countByEventId(Long eventId);

    long countByEventIdIn(Collection<Long> eventIds);

    @Query("select avg(r.rating) from Review r where r.event.id = :eventId")
    BigDecimal averageRatingByEventId(@Param("eventId") Long eventId);

    @Query("select avg(r.rating) from Review r where r.event.id in :eventIds")
    BigDecimal averageRatingByEventIds(@Param("eventIds") Collection<Long> eventIds);

    @Modifying
    @Query("delete from Review r where r.event.id = :eventId")
    void deleteByEventId(@Param("eventId") Long eventId);
}
