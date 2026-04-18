package com.festivalapp.backend.service;

import com.festivalapp.backend.dto.ReviewCreateRequest;
import com.festivalapp.backend.dto.ReviewResponse;
import com.festivalapp.backend.entity.Comment;
import com.festivalapp.backend.entity.Event;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.exception.ResourceNotFoundException;
import com.festivalapp.backend.repository.CommentRepository;
import com.festivalapp.backend.repository.EventRepository;
import com.festivalapp.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final CommentRepository commentRepository;
    private final UserRepository userRepository;
    private final EventRepository eventRepository;

    @Transactional
    public ReviewResponse create(ReviewCreateRequest request, String actorIdentifier) {
        User actor = resolveActor(actorIdentifier);
        Event event = eventRepository.findByIdAndDeletedAtIsNull(request.getEventId())
            .orElseThrow(() -> new ResourceNotFoundException("Event not found"));

        OffsetDateTime now = OffsetDateTime.now();
        Comment comment = commentRepository.save(Comment.builder()
            .user(actor)
            .event(event)
            .rating(request.getRating())
            .content(request.getText())
            .moderationStatus("на_рассмотрении")
            .createdAt(now)
            .updatedAt(now)
            .build());

        return toResponse(comment);
    }

    @Transactional(readOnly = true)
    public List<ReviewResponse> getByEvent(Long eventId) {
        return commentRepository.findAllByEventIdOrderByCreatedAtDesc(eventId).stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<ReviewResponse> getAllForAdmin() {
        return commentRepository.findAllByOrderByCreatedAtDesc().stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional
    public ReviewResponse update(Long reviewId, Integer rating, String text, String actorIdentifier) {
        User actor = resolveActor(actorIdentifier);
        Comment comment = commentRepository.findById(reviewId)
            .orElseThrow(() -> new ResourceNotFoundException("Review not found"));

        boolean owner = comment.getUser() != null && comment.getUser().getId().equals(actor.getId());
        if (!owner) {
            throw new ResourceNotFoundException("Review not found");
        }

        if (rating != null) {
            comment.setRating(rating);
        }
        if (text != null) {
            comment.setContent(text);
        }
        comment.setUpdatedAt(OffsetDateTime.now());

        return toResponse(commentRepository.save(comment));
    }

    @Transactional
    public Map<String, Object> delete(Long reviewId, String actorIdentifier) {
        User actor = resolveActor(actorIdentifier);
        Comment comment = commentRepository.findById(reviewId)
            .orElseThrow(() -> new ResourceNotFoundException("Review not found"));

        boolean owner = comment.getUser() != null && comment.getUser().getId().equals(actor.getId());
        if (!owner) {
            throw new ResourceNotFoundException("Review not found");
        }

        commentRepository.delete(comment);
        return Map.of("success", true);
    }

    private ReviewResponse toResponse(Comment comment) {
        String displayName = comment.getUser() == null
            ? null
            : (comment.getUser().getFirstName() + " " + comment.getUser().getLastName()).trim();

        return ReviewResponse.builder()
            .reviewId(comment.getId())
            .userId(comment.getUser() == null ? null : comment.getUser().getId())
            .userDisplayName(displayName)
            .rating(comment.getRating())
            .text(comment.getContent())
            .createdAt(comment.getCreatedAt() == null ? null : comment.getCreatedAt().toLocalDateTime())
            .eventId(comment.getEvent() == null ? null : comment.getEvent().getId())
            .build();
    }

    private User resolveActor(String actorIdentifier) {
        return userRepository.findByLoginOrEmailWithRoles(actorIdentifier)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
