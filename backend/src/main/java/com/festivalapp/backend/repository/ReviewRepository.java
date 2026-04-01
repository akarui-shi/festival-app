package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.Review;
import com.festivalapp.backend.entity.ReviewStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    @EntityGraph(attributePaths = {"user", "event"})
    List<Review> findByEventIdAndStatusOrderByCreatedAtDesc(Long eventId, ReviewStatus status);

    boolean existsByUserIdAndEventIdAndStatusIn(Long userId, Long eventId, List<ReviewStatus> statuses);

    @EntityGraph(attributePaths = {"user", "event"})
    Optional<Review> findWithUserAndEventById(Long id);

    @EntityGraph(attributePaths = {"user", "event"})
    List<Review> findByStatusOrderByCreatedAtDesc(ReviewStatus status);

    @EntityGraph(attributePaths = {"user", "event"})
    @Query("select r from Review r order by r.createdAt desc")
    List<Review> findAllWithUserAndEventOrderByCreatedAtDesc();

    @Modifying
    @Query("delete from Review r where r.event.id = :eventId")
    void deleteByEventId(@Param("eventId") Long eventId);
}
