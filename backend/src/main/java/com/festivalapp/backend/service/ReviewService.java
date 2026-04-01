package com.festivalapp.backend.service;

import com.festivalapp.backend.dto.ReviewCreateRequest;
import com.festivalapp.backend.dto.ReviewResponse;
import com.festivalapp.backend.entity.Event;
import com.festivalapp.backend.entity.Review;
import com.festivalapp.backend.entity.ReviewStatus;
import com.festivalapp.backend.entity.RoleName;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.exception.BadRequestException;
import com.festivalapp.backend.exception.ResourceNotFoundException;
import com.festivalapp.backend.repository.EventRepository;
import com.festivalapp.backend.repository.ReviewRepository;
import com.festivalapp.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private static final Set<ReviewStatus> ACTIVE_REVIEW_STATUSES =
        Set.of(ReviewStatus.PENDING, ReviewStatus.APPROVED, ReviewStatus.REJECTED);

    private final ReviewRepository reviewRepository;
    private final EventRepository eventRepository;
    private final UserRepository userRepository;

    @Transactional
    public ReviewResponse create(ReviewCreateRequest request, String actorIdentifier) {
        User user = loadActor(actorIdentifier);

        Event event = eventRepository.findById(request.getEventId())
            .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + request.getEventId()));

        boolean duplicateActiveReview = reviewRepository.existsByUserIdAndEventIdAndStatusIn(
            user.getId(),
            event.getId(),
            List.copyOf(ACTIVE_REVIEW_STATUSES)
        );
        if (duplicateActiveReview) {
            throw new BadRequestException("Duplicate review: user already has active review for this event");
        }

        Review review = Review.builder()
            .user(user)
            .event(event)
            .rating(request.getRating())
            .text(request.getText())
            .status(ReviewStatus.PENDING)
            .createdAt(LocalDateTime.now())
            .build();

        Review saved = reviewRepository.save(review);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<ReviewResponse> getApprovedByEvent(Long eventId) {
        if (!eventRepository.existsById(eventId)) {
            throw new ResourceNotFoundException("Event not found: " + eventId);
        }

        return reviewRepository.findByEventIdAndStatusOrderByCreatedAtDesc(eventId, ReviewStatus.APPROVED)
            .stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional
    public ReviewResponse update(Long reviewId, Integer rating, String text, String actorIdentifier) {
        User actor = loadActor(actorIdentifier);
        Review review = reviewRepository.findWithUserAndEventById(reviewId)
            .orElseThrow(() -> new ResourceNotFoundException("Review not found: " + reviewId));

        validateAuthorOrAdmin(actor, review.getUser().getId());

        if (review.getStatus() == ReviewStatus.DELETED) {
            throw new BadRequestException("Cannot edit deleted review");
        }

        boolean changed = false;
        if (rating != null) {
            review.setRating(rating);
            changed = true;
        }
        if (text != null) {
            review.setText(text);
            changed = true;
        }

        if (changed) {
            review.setStatus(ReviewStatus.PENDING);
        }

        Review saved = reviewRepository.save(review);
        return toResponse(saved);
    }

    @Transactional
    public Map<String, Object> delete(Long reviewId, String actorIdentifier) {
        User actor = loadActor(actorIdentifier);
        Review review = reviewRepository.findWithUserAndEventById(reviewId)
            .orElseThrow(() -> new ResourceNotFoundException("Review not found: " + reviewId));

        validateAuthorOrAdmin(actor, review.getUser().getId());

        review.setStatus(ReviewStatus.DELETED);
        reviewRepository.save(review);

        return Map.of(
            "message", "Review deleted successfully",
            "reviewId", reviewId,
            "status", review.getStatus()
        );
    }

    @Transactional
    public ReviewResponse updateStatus(Long reviewId, ReviewStatus status) {
        Review review = reviewRepository.findWithUserAndEventById(reviewId)
            .orElseThrow(() -> new ResourceNotFoundException("Review not found: " + reviewId));

        review.setStatus(status);
        Review saved = reviewRepository.save(review);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<ReviewResponse> getAllForAdmin(ReviewStatus status) {
        List<Review> reviews = status == null
            ? reviewRepository.findAllWithUserAndEventOrderByCreatedAtDesc()
            : reviewRepository.findByStatusOrderByCreatedAtDesc(status);

        return reviews.stream()
            .map(this::toResponse)
            .toList();
    }

    private User loadActor(String actorIdentifier) {
        return userRepository.findByLoginOrEmailWithRoles(actorIdentifier)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private void validateAuthorOrAdmin(User actor, Long ownerId) {
        if (Objects.equals(actor.getId(), ownerId) || hasRole(actor, RoleName.ROLE_ADMIN)) {
            return;
        }
        throw new AccessDeniedException("Access denied");
    }

    private boolean hasRole(User user, RoleName roleName) {
        return user.getUserRoles().stream()
            .anyMatch(userRole -> userRole.getRole().getName() == roleName);
    }

    private ReviewResponse toResponse(Review review) {
        User user = review.getUser();
        String displayName = ((user.getFirstName() == null ? "" : user.getFirstName()) + " "
            + (user.getLastName() == null ? "" : user.getLastName())).trim();
        if (displayName.isEmpty()) {
            displayName = user.getLogin();
        }

        return ReviewResponse.builder()
            .reviewId(review.getId())
            .userId(user.getId())
            .userDisplayName(displayName)
            .rating(review.getRating())
            .text(review.getText())
            .createdAt(review.getCreatedAt())
            .status(review.getStatus())
            .eventId(review.getEvent() != null ? review.getEvent().getId() : null)
            .build();
    }
}
