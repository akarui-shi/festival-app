package com.festivalapp.backend.service;

import com.festivalapp.backend.dto.ReviewCreateRequest;
import com.festivalapp.backend.dto.ReviewResponse;
import com.festivalapp.backend.entity.EventStatus;
import com.festivalapp.backend.entity.Event;
import com.festivalapp.backend.entity.Review;
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

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final EventRepository eventRepository;
    private final UserRepository userRepository;

    @Transactional
    public ReviewResponse create(ReviewCreateRequest request, String actorIdentifier) {
        User user = loadActor(actorIdentifier);
        if (hasRole(user, RoleName.ROLE_ADMIN) || hasRole(user, RoleName.ROLE_ORGANIZER)) {
            throw new AccessDeniedException("Только жители могут оставлять отзывы");
        }

        Event event = eventRepository.findById(request.getEventId())
            .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + request.getEventId()));
        ensureEventIsPublished(event);

        if (reviewRepository.existsByUserIdAndEventId(user.getId(), event.getId())) {
            throw new BadRequestException("Duplicate review: user already has review for this event");
        }

        Review review = Review.builder()
            .user(user)
            .event(event)
            .rating(request.getRating())
            .text(request.getText())
            .createdAt(LocalDateTime.now())
            .build();

        Review saved = reviewRepository.save(review);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<ReviewResponse> getByEvent(Long eventId) {
        Event event = eventRepository.findById(eventId)
            .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + eventId));
        ensureEventIsPublished(event);

        return reviewRepository.findByEventIdOrderByCreatedAtDesc(eventId)
            .stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<ReviewResponse> getAllForAdmin() {
        return reviewRepository.findAllByOrderByCreatedAtDesc().stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional
    public ReviewResponse update(Long reviewId, Integer rating, String text, String actorIdentifier) {
        User actor = loadActor(actorIdentifier);
        Review review = reviewRepository.findWithUserAndEventById(reviewId)
            .orElseThrow(() -> new ResourceNotFoundException("Review not found: " + reviewId));

        validateAuthorOrAdmin(actor, review.getUser().getId());

        if (rating != null) {
            review.setRating(rating);
        }
        if (text != null) {
            review.setText(text);
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
        reviewRepository.delete(review);

        return Map.of(
            "message", "Review deleted successfully",
            "reviewId", reviewId
        );
    }

    private void ensureEventIsPublished(Event event) {
        if (event == null || event.getStatus() != EventStatus.PUBLISHED) {
            throw new ResourceNotFoundException("Event not found");
        }
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
            .eventId(review.getEvent() != null ? review.getEvent().getId() : null)
            .build();
    }
}
