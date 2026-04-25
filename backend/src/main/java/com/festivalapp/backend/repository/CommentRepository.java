package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.Comment;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    @EntityGraph(attributePaths = {"user", "user.avatarImage", "event"})
    List<Comment> findAllByEventIdOrderByCreatedAtDesc(Long eventId);

    @EntityGraph(attributePaths = {"user", "user.avatarImage", "event"})
    List<Comment> findAllByOrderByCreatedAtDesc();

    @EntityGraph(attributePaths = {"user", "user.avatarImage", "event"})
    Optional<Comment> findById(Long id);

    long countByEventId(Long eventId);

    @Query("select avg(c.rating) from Comment c where c.event.id = :eventId and c.rating is not null")
    Double averageRatingByEventId(Long eventId);
}
