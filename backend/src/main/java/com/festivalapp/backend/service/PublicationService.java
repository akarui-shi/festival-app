package com.festivalapp.backend.service;

import com.festivalapp.backend.dto.PublicationCreateRequest;
import com.festivalapp.backend.dto.PublicationDetailsResponse;
import com.festivalapp.backend.dto.PublicationShortResponse;
import com.festivalapp.backend.dto.PublicationUpdateRequest;
import com.festivalapp.backend.entity.Event;
import com.festivalapp.backend.entity.EventImage;
import com.festivalapp.backend.entity.Image;
import com.festivalapp.backend.entity.Organization;
import com.festivalapp.backend.entity.OrganizationMember;
import com.festivalapp.backend.entity.Publication;
import com.festivalapp.backend.entity.PublicationImage;
import com.festivalapp.backend.entity.PublicationStatus;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.exception.BadRequestException;
import com.festivalapp.backend.exception.ResourceNotFoundException;
import com.festivalapp.backend.repository.EventImageRepository;
import com.festivalapp.backend.repository.EventRepository;
import com.festivalapp.backend.repository.ImageRepository;
import com.festivalapp.backend.repository.OrganizationMemberRepository;
import com.festivalapp.backend.repository.PublicationImageRepository;
import com.festivalapp.backend.repository.PublicationRepository;
import com.festivalapp.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class PublicationService {

    private final PublicationRepository publicationRepository;
    private final PublicationImageRepository publicationImageRepository;
    private final ImageRepository imageRepository;
    private final EventImageRepository eventImageRepository;
    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    private final OrganizationMemberRepository organizationMemberRepository;

    @Transactional
    public PublicationDetailsResponse create(PublicationCreateRequest request, String actorIdentifier) {
        User actor = resolveActor(actorIdentifier);
        Event event = eventRepository.findByIdAndDeletedAtIsNull(request.getEventId())
            .orElseThrow(() -> new ResourceNotFoundException("Event not found"));
        assertCanPublish(actor, event.getOrganization());

        OffsetDateTime now = OffsetDateTime.now();
        Publication publication = publicationRepository.save(Publication.builder()
            .event(event)
            .organization(event.getOrganization())
            .createdByUser(actor)
            .title(normalizeRequired(request.getTitle(), "Title is required"))
            .content(normalizeRequired(request.getContent(), "Content is required"))
            .status(PublicationStatus.PENDING.name())
            .moderationStatus("на_рассмотрении")
            .createdAt(now)
            .updatedAt(now)
            .build());

        replacePublicationImage(publication, request.getImageUrl());
        return toDetails(publicationRepository.findById(publication.getId()).orElse(publication));
    }

    @Transactional(readOnly = true)
    public List<PublicationShortResponse> getMine(String actorIdentifier) {
        User actor = resolveActor(actorIdentifier);
        return publicationRepository.findAllByCreatedByUserIdOrderByCreatedAtDesc(actor.getId()).stream()
            .map(this::toShort)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<PublicationShortResponse> getPublicList(Long eventId, String title) {
        List<Publication> list = eventId == null
            ? publicationRepository.findAllByOrderByCreatedAtDesc()
            : publicationRepository.findAllByEventIdOrderByCreatedAtDesc(eventId);

        return list.stream()
            .filter(publication -> DomainStatusMapper.toPublicationStatus(publication.getStatus()) == PublicationStatus.PUBLISHED)
            .filter(publication -> {
                if (!StringUtils.hasText(title)) {
                    return true;
                }
                return publication.getTitle() != null
                    && publication.getTitle().toLowerCase().contains(title.trim().toLowerCase());
            })
            .map(this::toShort)
            .toList();
    }

    @Transactional(readOnly = true)
    public PublicationDetailsResponse getPublicById(Long id) {
        Publication publication = publicationRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Publication not found"));

        PublicationStatus status = DomainStatusMapper.toPublicationStatus(publication.getStatus());
        if (status != PublicationStatus.PUBLISHED) {
            throw new ResourceNotFoundException("Publication not found");
        }

        return toDetails(publication);
    }

    @Transactional
    public PublicationDetailsResponse update(Long id, PublicationUpdateRequest request, String actorIdentifier) {
        User actor = resolveActor(actorIdentifier);
        Publication publication = publicationRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Publication not found"));

        assertCanEdit(actor, publication);

        if (StringUtils.hasText(request.getTitle())) {
            publication.setTitle(request.getTitle().trim());
        }
        if (request.getContent() != null) {
            publication.setContent(request.getContent().trim());
        }
        if (request.getEventId() != null && !Objects.equals(request.getEventId(), publication.getEvent().getId())) {
            Event newEvent = eventRepository.findByIdAndDeletedAtIsNull(request.getEventId())
                .orElseThrow(() -> new ResourceNotFoundException("Event not found"));
            assertCanPublish(actor, newEvent.getOrganization());
            publication.setEvent(newEvent);
            publication.setOrganization(newEvent.getOrganization());
        }

        publication.setStatus(PublicationStatus.PENDING.name());
        publication.setModerationStatus("на_рассмотрении");
        publication.setUpdatedAt(OffsetDateTime.now());

        Publication saved = publicationRepository.save(publication);
        if (request.getImageUrl() != null) {
            replacePublicationImage(saved, request.getImageUrl());
        }

        return toDetails(saved);
    }

    @Transactional
    public Map<String, Object> delete(Long id, String actorIdentifier) {
        User actor = resolveActor(actorIdentifier);
        Publication publication = publicationRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Publication not found"));

        assertCanEdit(actor, publication);
        publication.setStatus(PublicationStatus.DELETED.name());
        publication.setUpdatedAt(OffsetDateTime.now());
        publicationRepository.save(publication);
        return Map.of("success", true);
    }

    @Transactional
    public PublicationDetailsResponse updateStatus(Long id, PublicationStatus status) {
        Publication publication = publicationRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Publication not found"));

        publication.setStatus(DomainStatusMapper.toPublicationDbStatus(status));
        publication.setModerationStatus(status == PublicationStatus.REJECTED ? "отклонено" : "одобрено");
        if (status == PublicationStatus.PUBLISHED) {
            publication.setPublishedAt(OffsetDateTime.now());
        }
        publication.setUpdatedAt(OffsetDateTime.now());

        return toDetails(publicationRepository.save(publication));
    }

    @Transactional(readOnly = true)
    public List<PublicationShortResponse> getAllForAdmin(PublicationStatus status) {
        return publicationRepository.findAllByOrderByCreatedAtDesc().stream()
            .filter(publication -> status == null || DomainStatusMapper.toPublicationStatus(publication.getStatus()) == status)
            .map(this::toShort)
            .toList();
    }

    private PublicationDetailsResponse toDetails(Publication publication) {
        return PublicationDetailsResponse.builder()
            .publicationId(publication.getId())
            .title(publication.getTitle())
            .content(publication.getContent())
            .imageUrl(getPublicationImageUrl(publication.getId()))
            .createdAt(publication.getCreatedAt() == null ? null : publication.getCreatedAt().toLocalDateTime())
            .status(DomainStatusMapper.toPublicationStatus(publication.getStatus()))
            .authorName(fullName(publication.getCreatedByUser()))
            .authorId(publication.getCreatedByUser() == null ? null : publication.getCreatedByUser().getId())
            .organizationId(publication.getOrganization() == null ? null : publication.getOrganization().getId())
            .organizationName(publication.getOrganization() == null ? null : publication.getOrganization().getName())
            .eventId(publication.getEvent() == null ? null : publication.getEvent().getId())
            .eventTitle(publication.getEvent() == null ? null : publication.getEvent().getTitle())
            .eventImageUrl(getEventCover(publication.getEvent() == null ? null : publication.getEvent().getId()))
            .build();
    }

    private PublicationShortResponse toShort(Publication publication) {
        String content = publication.getContent() == null ? "" : publication.getContent();
        String preview = content.length() > 140 ? content.substring(0, 140) + "..." : content;

        return PublicationShortResponse.builder()
            .publicationId(publication.getId())
            .title(publication.getTitle())
            .preview(preview)
            .createdAt(publication.getCreatedAt() == null ? null : publication.getCreatedAt().toLocalDateTime())
            .status(DomainStatusMapper.toPublicationStatus(publication.getStatus()))
            .authorName(fullName(publication.getCreatedByUser()))
            .imageUrl(getPublicationImageUrl(publication.getId()))
            .organizationId(publication.getOrganization() == null ? null : publication.getOrganization().getId())
            .organizationName(publication.getOrganization() == null ? null : publication.getOrganization().getName())
            .eventId(publication.getEvent() == null ? null : publication.getEvent().getId())
            .eventTitle(publication.getEvent() == null ? null : publication.getEvent().getTitle())
            .eventImageUrl(getEventCover(publication.getEvent() == null ? null : publication.getEvent().getId()))
            .build();
    }

    private void replacePublicationImage(Publication publication, String imageUrl) {
        publicationImageRepository.deleteByPublicationId(publication.getId());
        if (!StringUtils.hasText(imageUrl)) {
            return;
        }

        Image image = imageRepository.save(Image.builder()
            .fileName(fileNameFromUrl(imageUrl))
            .mimeType("image/*")
            .fileSize(0L)
            .fileUrl(imageUrl.trim())
            .uploadedAt(OffsetDateTime.now())
            .build());

        publicationImageRepository.save(PublicationImage.builder()
            .publication(publication)
            .image(image)
            .sortOrder(0)
            .build());
    }

    private String getPublicationImageUrl(Long publicationId) {
        return publicationImageRepository.findAllByPublicationIdOrderBySortOrderAscIdAsc(publicationId).stream()
            .findFirst()
            .map(PublicationImage::getImage)
            .map(Image::getFileUrl)
            .orElse(null);
    }

    private String getEventCover(Long eventId) {
        if (eventId == null) {
            return null;
        }
        return eventImageRepository.findFirstByEventIdAndPrimaryIsTrueOrderBySortOrderAscIdAsc(eventId)
            .map(EventImage::getImage)
            .map(Image::getFileUrl)
            .orElse(null);
    }

    private void assertCanPublish(User actor, Organization organization) {
        if (organization == null) {
            throw new BadRequestException("Organization is required");
        }
        boolean member = organizationMemberRepository.existsByUserIdAndOrganizationIdAndLeftAtIsNull(actor.getId(), organization.getId());
        if (!member) {
            throw new BadRequestException("Недостаточно прав для публикации");
        }
    }

    private void assertCanEdit(User actor, Publication publication) {
        if (publication.getCreatedByUser() != null && Objects.equals(publication.getCreatedByUser().getId(), actor.getId())) {
            return;
        }
        boolean member = publication.getOrganization() != null
            && organizationMemberRepository.existsByUserIdAndOrganizationIdAndLeftAtIsNull(actor.getId(), publication.getOrganization().getId());
        if (!member) {
            throw new BadRequestException("Недостаточно прав");
        }
    }

    private User resolveActor(String actorIdentifier) {
        return userRepository.findByLoginOrEmailWithRoles(actorIdentifier)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private String fullName(User user) {
        if (user == null) {
            return null;
        }
        return (user.getFirstName() + " " + user.getLastName()).trim();
    }

    private String normalizeRequired(String value, String message) {
        if (!StringUtils.hasText(value)) {
            throw new BadRequestException(message);
        }
        return value.trim();
    }

    private String fileNameFromUrl(String url) {
        String trimmed = url.trim();
        int slash = trimmed.lastIndexOf('/');
        if (slash < 0 || slash == trimmed.length() - 1) {
            return "image-" + System.nanoTime();
        }
        return trimmed.substring(slash + 1);
    }
}
