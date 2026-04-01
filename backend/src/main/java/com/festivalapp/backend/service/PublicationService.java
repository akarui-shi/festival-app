package com.festivalapp.backend.service;

import com.festivalapp.backend.dto.PublicationCreateRequest;
import com.festivalapp.backend.dto.PublicationDetailsResponse;
import com.festivalapp.backend.dto.PublicationShortResponse;
import com.festivalapp.backend.dto.PublicationUpdateRequest;
import com.festivalapp.backend.entity.Event;
import com.festivalapp.backend.entity.Publication;
import com.festivalapp.backend.entity.PublicationStatus;
import com.festivalapp.backend.entity.RoleName;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.exception.BadRequestException;
import com.festivalapp.backend.exception.ResourceNotFoundException;
import com.festivalapp.backend.repository.EventRepository;
import com.festivalapp.backend.repository.PublicationRepository;
import com.festivalapp.backend.repository.UserRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class PublicationService {

    private static final int PREVIEW_MAX_LENGTH = 160;

    private final PublicationRepository publicationRepository;
    private final EventRepository eventRepository;
    private final UserRepository userRepository;

    @Transactional
    public PublicationDetailsResponse create(PublicationCreateRequest request, String actorIdentifier) {
        User actor = loadActor(actorIdentifier);
        Event event = resolveEventOrNull(request.getEventId());

        Publication publication = Publication.builder()
            .title(request.getTitle())
            .content(request.getContent())
            .status(PublicationStatus.PENDING)
            .createdAt(LocalDateTime.now())
            .author(actor)
            .event(event)
            .build();

        Publication saved = publicationRepository.save(publication);
        return toDetailsResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<PublicationShortResponse> getPublicList(Long eventId, String title) {
        Specification<Publication> specification = buildPublicSpecification(eventId, title);
        List<Publication> publications = publicationRepository.findAll(
            specification,
            Sort.by(Sort.Direction.DESC, "createdAt")
        );

        return publications.stream()
            .map(this::toShortResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public PublicationDetailsResponse getPublicById(Long id) {
        Publication publication = publicationRepository.findWithAuthorAndEventById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Publication not found: " + id));

        if (publication.getStatus() != PublicationStatus.PUBLISHED) {
            throw new ResourceNotFoundException("Publication not found: " + id);
        }

        return toDetailsResponse(publication);
    }

    @Transactional
    public PublicationDetailsResponse update(Long id, PublicationUpdateRequest request, String actorIdentifier) {
        User actor = loadActor(actorIdentifier);
        Publication publication = publicationRepository.findWithAuthorAndEventById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Publication not found: " + id));

        validateAuthorOrAdmin(actor, publication.getAuthor().getId());

        if (publication.getStatus() == PublicationStatus.DELETED) {
            throw new BadRequestException("Cannot edit deleted publication");
        }

        if (request.getTitle() != null) {
            publication.setTitle(request.getTitle());
        }
        if (request.getContent() != null) {
            publication.setContent(request.getContent());
        }
        if (request.getEventId() != null) {
            publication.setEvent(resolveEventOrNull(request.getEventId()));
        }

        // On edit we return publication back to moderation flow.
        publication.setStatus(PublicationStatus.PENDING);

        Publication saved = publicationRepository.save(publication);
        return toDetailsResponse(saved);
    }

    @Transactional
    public Map<String, Object> delete(Long id, String actorIdentifier) {
        User actor = loadActor(actorIdentifier);
        Publication publication = publicationRepository.findWithAuthorAndEventById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Publication not found: " + id));

        validateAuthorOrAdmin(actor, publication.getAuthor().getId());

        publication.setStatus(PublicationStatus.DELETED);
        publicationRepository.save(publication);

        return Map.of(
            "message", "Publication deleted successfully",
            "publicationId", id,
            "status", publication.getStatus()
        );
    }

    @Transactional
    public PublicationDetailsResponse updateStatus(Long id, PublicationStatus status) {
        Publication publication = publicationRepository.findWithAuthorAndEventById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Publication not found: " + id));

        publication.setStatus(status);
        Publication saved = publicationRepository.save(publication);
        return toDetailsResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<PublicationShortResponse> getAllForAdmin(PublicationStatus status) {
        List<Publication> publications = status == null
            ? publicationRepository.findAll(
                (root, query, cb) -> cb.conjunction(),
                Sort.by(Sort.Direction.DESC, "createdAt")
            )
            : publicationRepository.findAll(
                (root, query, cb) -> cb.equal(root.get("status"), status),
                Sort.by(Sort.Direction.DESC, "createdAt")
            );

        return publications.stream()
            .map(this::toShortResponse)
            .toList();
    }

    private Specification<Publication> buildPublicSpecification(Long eventId, String title) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (query != null) {
                query.distinct(true);
            }

            predicates.add(cb.equal(root.get("status"), PublicationStatus.PUBLISHED));

            if (eventId != null) {
                predicates.add(cb.equal(root.get("event").get("id"), eventId));
            }
            if (StringUtils.hasText(title)) {
                predicates.add(cb.like(
                    cb.lower(root.get("title")),
                    "%" + title.trim().toLowerCase(Locale.ROOT) + "%"
                ));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private User loadActor(String actorIdentifier) {
        return userRepository.findByLoginOrEmailWithRoles(actorIdentifier)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private Event resolveEventOrNull(Long eventId) {
        if (eventId == null) {
            return null;
        }
        return eventRepository.findById(eventId)
            .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + eventId));
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

    private PublicationShortResponse toShortResponse(Publication publication) {
        return PublicationShortResponse.builder()
            .publicationId(publication.getId())
            .title(publication.getTitle())
            .preview(buildPreview(publication.getContent()))
            .createdAt(publication.getCreatedAt())
            .status(publication.getStatus())
            .authorName(resolveAuthorName(publication.getAuthor()))
            .eventId(publication.getEvent() != null ? publication.getEvent().getId() : null)
            .build();
    }

    private PublicationDetailsResponse toDetailsResponse(Publication publication) {
        return PublicationDetailsResponse.builder()
            .publicationId(publication.getId())
            .title(publication.getTitle())
            .content(publication.getContent())
            .createdAt(publication.getCreatedAt())
            .status(publication.getStatus())
            .authorName(resolveAuthorName(publication.getAuthor()))
            .authorId(publication.getAuthor() != null ? publication.getAuthor().getId() : null)
            .eventId(publication.getEvent() != null ? publication.getEvent().getId() : null)
            .eventTitle(publication.getEvent() != null ? publication.getEvent().getTitle() : null)
            .build();
    }

    private String resolveAuthorName(User user) {
        if (user == null) {
            return null;
        }
        String displayName = ((user.getFirstName() == null ? "" : user.getFirstName()) + " "
            + (user.getLastName() == null ? "" : user.getLastName())).trim();
        return displayName.isEmpty() ? user.getLogin() : displayName;
    }

    private String buildPreview(String content) {
        if (content == null) {
            return "";
        }
        String normalized = content.trim();
        if (normalized.length() <= PREVIEW_MAX_LENGTH) {
            return normalized;
        }
        return normalized.substring(0, PREVIEW_MAX_LENGTH) + "...";
    }
}
