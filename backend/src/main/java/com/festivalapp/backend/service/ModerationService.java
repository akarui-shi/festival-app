package com.festivalapp.backend.service;

import com.festivalapp.backend.dto.ModerationDecisionRequest;
import com.festivalapp.backend.dto.ModerationResponse;
import com.festivalapp.backend.entity.Artist;
import com.festivalapp.backend.entity.Comment;
import com.festivalapp.backend.entity.Event;
import com.festivalapp.backend.entity.Moderation;
import com.festivalapp.backend.entity.Publication;
import com.festivalapp.backend.entity.RoleName;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.exception.BadRequestException;
import com.festivalapp.backend.exception.ResourceNotFoundException;
import com.festivalapp.backend.repository.ArtistRepository;
import com.festivalapp.backend.repository.CommentRepository;
import com.festivalapp.backend.repository.EventRepository;
import com.festivalapp.backend.repository.ModerationRepository;
import com.festivalapp.backend.repository.OrganizationRepository;
import com.festivalapp.backend.repository.PublicationRepository;
import com.festivalapp.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class ModerationService {

    private final ModerationRepository moderationRepository;
    private final UserRepository userRepository;
    private final EventRepository eventRepository;
    private final OrganizationRepository organizationRepository;
    private final ArtistRepository artistRepository;
    private final PublicationRepository publicationRepository;
    private final CommentRepository commentRepository;
    private final AdminAuditService adminAuditService;

    @Transactional
    public ModerationResponse applyDecision(ModerationDecisionRequest request, String adminIdentifier) {
        User admin = resolveAdmin(adminIdentifier);

        String decision = normalizeDecision(request.getDecision());
        String entityType = normalizeEntityType(request.getEntityType());

        switch (entityType) {
            case "МЕРОПРИЯТИЕ" -> moderateEvent(request.getEntityId(), decision);
            case "ОРГАНИЗАЦИЯ" -> moderateOrganization(request.getEntityId(), decision);
            case "АРТИСТ" -> moderateArtist(request.getEntityId(), decision);
            case "ПУБЛИКАЦИЯ" -> moderatePublication(request.getEntityId(), decision);
            case "КОММЕНТАРИЙ" -> moderateComment(request.getEntityId(), decision);
            default -> throw new BadRequestException("Неподдерживаемый тип сущности: " + request.getEntityType());
        }

        Moderation moderation = moderationRepository.save(Moderation.builder()
            .admin(admin)
            .entityType(normalizeEntityTypeRussian(entityType))
            .entityId(request.getEntityId())
            .decision(decision)
            .moderatorComment(request.getModeratorComment())
            .decidedAt(OffsetDateTime.now())
            .build());
        adminAuditService.log(
            adminIdentifier,
            "MODERATION_DECISION",
            normalizeEntityTypeRussian(entityType),
            request.getEntityId(),
            decision
        );

        return toResponse(moderation);
    }

    @Transactional(readOnly = true)
    public List<ModerationResponse> getRecent() {
        return moderationRepository.findAllByOrderByDecidedAtDesc().stream()
            .map(this::toResponse)
            .toList();
    }

    private void moderateEvent(Long eventId, String decision) {
        Event event = eventRepository.findByIdAndDeletedAtIsNull(eventId)
            .orElseThrow(() -> new ResourceNotFoundException("Event not found"));

        event.setModerationStatus("одобрено".equals(decision) ? "одобрено" : "отклонено");
        if ("одобрено".equals(decision)) {
            event.setStatus("опубликовано");
        } else {
            event.setStatus("отменено");
        }
        event.setUpdatedAt(OffsetDateTime.now());
        eventRepository.save(event);
    }

    private void moderateOrganization(Long organizationId, String decision) {
        var organization = organizationRepository.findById(organizationId)
            .orElseThrow(() -> new ResourceNotFoundException("Organization not found"));
        organization.setModerationStatus("одобрено".equals(decision) ? "одобрена" : "отклонена");
        organization.setUpdatedAt(OffsetDateTime.now());
        organizationRepository.save(organization);
    }

    private void moderateArtist(Long artistId, String decision) {
        Artist artist = artistRepository.findById(artistId)
            .orElseThrow(() -> new ResourceNotFoundException("Artist not found"));
        if ("одобрено".equals(decision)) {
            artist.setDeletedAt(null);
        } else {
            artist.setDeletedAt(OffsetDateTime.now());
        }
        artist.setUpdatedAt(OffsetDateTime.now());
        artistRepository.save(artist);
    }

    private void moderatePublication(Long publicationId, String decision) {
        Publication publication = publicationRepository.findById(publicationId)
            .orElseThrow(() -> new ResourceNotFoundException("Publication not found"));

        publication.setModerationStatus("одобрено".equals(decision) ? "одобрено" : "отклонено");
        publication.setStatus("одобрено".equals(decision) ? "PUBLISHED" : "REJECTED");
        if ("одобрено".equals(decision)) {
            publication.setPublishedAt(OffsetDateTime.now());
        }
        publication.setUpdatedAt(OffsetDateTime.now());
        publicationRepository.save(publication);
    }

    private void moderateComment(Long commentId, String decision) {
        Comment comment = commentRepository.findById(commentId)
            .orElseThrow(() -> new ResourceNotFoundException("Comment not found"));
        comment.setModerationStatus("одобрено".equals(decision) ? "одобрено" : "отклонено");
        comment.setUpdatedAt(OffsetDateTime.now());
        commentRepository.save(comment);
    }

    private ModerationResponse toResponse(Moderation moderation) {
        return ModerationResponse.builder()
            .moderationId(moderation.getId())
            .adminId(moderation.getAdmin() == null ? null : moderation.getAdmin().getId())
            .entityType(moderation.getEntityType())
            .entityId(moderation.getEntityId())
            .decision(moderation.getDecision())
            .moderatorComment(moderation.getModeratorComment())
            .decidedAt(moderation.getDecidedAt() == null ? null : moderation.getDecidedAt().toLocalDateTime())
            .build();
    }

    private User resolveAdmin(String identifier) {
        User user = userRepository.findByLoginOrEmailWithRoles(identifier)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        boolean admin = user.getUserRoles().stream()
            .anyMatch(userRole -> userRole.getRole().toRoleName() == RoleName.ROLE_ADMIN);
        if (!admin) {
            throw new BadRequestException("Недостаточно прав для модерации");
        }
        return user;
    }

    private String normalizeDecision(String decision) {
        if (decision == null || decision.isBlank()) {
            throw new BadRequestException("Решение модерации не указано");
        }
        String normalized = decision.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "approve", "approved", "одобрено", "одобрить" -> "одобрено";
            case "reject", "rejected", "отклонено", "отклонить" -> "отклонено";
            default -> throw new BadRequestException("Некорректное решение модерации: " + decision);
        };
    }

    private String normalizeEntityType(String entityType) {
        if (entityType == null || entityType.isBlank()) {
            throw new BadRequestException("Тип сущности не указан");
        }
        String normalized = entityType.trim().toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case "МЕРОПРИЯТИЕ", "EVENT" -> "МЕРОПРИЯТИЕ";
            case "ОРГАНИЗАЦИЯ", "ORGANIZATION", "ORGANISATION" -> "ОРГАНИЗАЦИЯ";
            case "АРТИСТ", "ARTIST" -> "АРТИСТ";
            case "ПУБЛИКАЦИЯ", "PUBLICATION", "POST" -> "ПУБЛИКАЦИЯ";
            case "КОММЕНТАРИЙ", "COMMENT" -> "КОММЕНТАРИЙ";
            default -> normalized;
        };
    }

    private String normalizeEntityTypeRussian(String entityTypeUpper) {
        return switch (entityTypeUpper) {
            case "МЕРОПРИЯТИЕ" -> "Мероприятие";
            case "ОРГАНИЗАЦИЯ" -> "Организация";
            case "АРТИСТ" -> "Артист";
            case "ПУБЛИКАЦИЯ" -> "Публикация";
            case "КОММЕНТАРИЙ" -> "Комментарий";
            default -> entityTypeUpper;
        };
    }
}
