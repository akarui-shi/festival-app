package com.festivalapp.backend.service;

import com.festivalapp.backend.dto.CommentCreateRequest;
import com.festivalapp.backend.dto.CommentResponse;
import com.festivalapp.backend.dto.CommentUpdateRequest;
import com.festivalapp.backend.entity.Comment;
import com.festivalapp.backend.entity.Event;
import com.festivalapp.backend.entity.RoleName;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.exception.BadRequestException;
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
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;
    private final UserRepository userRepository;
    private final EventRepository eventRepository;

    @Transactional
    public CommentResponse create(CommentCreateRequest request, String actorIdentifier) {
        User actor = resolveActor(actorIdentifier);
        Event event = eventRepository.findByIdAndDeletedAtIsNull(request.getEventId())
            .orElseThrow(() -> new ResourceNotFoundException("Event not found"));
        String text = normalizeText(request.getText());

        OffsetDateTime now = OffsetDateTime.now();
        Comment comment = commentRepository.save(Comment.builder()
            .user(actor)
            .event(event)
            .content(text)
            .rating(request.getRating())
            .moderationStatus("на_рассмотрении")
            .createdAt(now)
            .updatedAt(now)
            .build());

        return toResponse(comment);
    }

    @Transactional(readOnly = true)
    public List<CommentResponse> getByEvent(Long eventId, boolean includeUnmoderated) {
        List<Comment> comments = commentRepository.findAllByEventIdOrderByCreatedAtDesc(eventId);
        return comments.stream()
            .filter(comment -> includeUnmoderated || "одобрено".equalsIgnoreCase(comment.getModerationStatus()))
            .map(this::toResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<CommentResponse> getAllForAdmin() {
        return commentRepository.findAllByOrderByCreatedAtDesc().stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional
    public CommentResponse update(Long commentId, CommentUpdateRequest request, String actorIdentifier) {
        User actor = resolveActor(actorIdentifier);
        Comment comment = commentRepository.findById(commentId)
            .orElseThrow(() -> new ResourceNotFoundException("Comment not found"));

        if (!isOwner(actor, comment) && !hasAdminRole(actor)) {
            throw new BadRequestException("Недостаточно прав для редактирования комментария");
        }

        if (request.getText() != null) {
            comment.setContent(normalizeText(request.getText()));
        }
        if (request.getRating() != null) {
            comment.setRating(request.getRating());
        }
        comment.setModerationStatus("на_рассмотрении");
        comment.setUpdatedAt(OffsetDateTime.now());

        return toResponse(commentRepository.save(comment));
    }

    @Transactional
    public Map<String, Object> delete(Long commentId, String actorIdentifier) {
        User actor = resolveActor(actorIdentifier);
        Comment comment = commentRepository.findById(commentId)
            .orElseThrow(() -> new ResourceNotFoundException("Comment not found"));

        if (!isOwner(actor, comment) && !hasAdminRole(actor)) {
            throw new BadRequestException("Недостаточно прав для удаления комментария");
        }

        commentRepository.delete(comment);
        return Map.of("success", true);
    }

    private CommentResponse toResponse(Comment comment) {
        return CommentResponse.builder()
            .commentId(comment.getId())
            .eventId(comment.getEvent() == null ? null : comment.getEvent().getId())
            .userId(comment.getUser() == null ? null : comment.getUser().getId())
            .userDisplayName(comment.getUser() == null ? null : (comment.getUser().getFirstName() + " " + comment.getUser().getLastName()).trim())
            .text(comment.getContent())
            .rating(comment.getRating())
            .moderationStatus(comment.getModerationStatus())
            .createdAt(comment.getCreatedAt() == null ? null : comment.getCreatedAt().toLocalDateTime())
            .updatedAt(comment.getUpdatedAt() == null ? null : comment.getUpdatedAt().toLocalDateTime())
            .build();
    }

    private boolean hasAdminRole(User user) {
        return user.getUserRoles().stream()
            .anyMatch(userRole -> userRole.getRole().toRoleName() == RoleName.ROLE_ADMIN);
    }

    private boolean isOwner(User actor, Comment comment) {
        return comment.getUser() != null && Objects.equals(comment.getUser().getId(), actor.getId());
    }

    private User resolveActor(String actorIdentifier) {
        return userRepository.findByLoginOrEmailWithRoles(actorIdentifier)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private String normalizeText(String text) {
        if (text == null || text.trim().isEmpty()) {
            throw new BadRequestException("Текст комментария обязателен");
        }
        return text.trim();
    }
}
