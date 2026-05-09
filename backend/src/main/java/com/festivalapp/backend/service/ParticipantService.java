package com.festivalapp.backend.service;

import com.festivalapp.backend.dto.ParticipantDetailsResponse;
import com.festivalapp.backend.dto.ParticipantSummaryResponse;
import com.festivalapp.backend.dto.ParticipantUpsertRequest;
import com.festivalapp.backend.dto.CategoryResponse;
import com.festivalapp.backend.dto.EventShortResponse;
import com.festivalapp.backend.entity.Participant;
import com.festivalapp.backend.entity.ParticipantImage;
import com.festivalapp.backend.entity.Category;
import com.festivalapp.backend.entity.Event;
import com.festivalapp.backend.entity.EventParticipant;
import com.festivalapp.backend.entity.EventCategory;
import com.festivalapp.backend.entity.EventImage;
import com.festivalapp.backend.entity.EventStatus;
import com.festivalapp.backend.entity.Image;
import com.festivalapp.backend.entity.RoleName;
import com.festivalapp.backend.entity.Session;
import com.festivalapp.backend.entity.TicketType;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.exception.BadRequestException;
import com.festivalapp.backend.exception.ResourceNotFoundException;
import com.festivalapp.backend.repository.ParticipantImageRepository;
import com.festivalapp.backend.repository.ParticipantRepository;
import com.festivalapp.backend.repository.EventCategoryRepository;
import com.festivalapp.backend.repository.EventParticipantRepository;
import com.festivalapp.backend.repository.EventImageRepository;
import com.festivalapp.backend.repository.ImageRepository;
import com.festivalapp.backend.repository.SessionRepository;
import com.festivalapp.backend.repository.TicketTypeRepository;
import com.festivalapp.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ParticipantService {

    private static final String DEFAULT_KIND = "исполнитель";
    private static final Set<String> ALLOWED_KINDS = Set.of(
        "исполнитель", "лектор", "экскурсовод", "ансамбль", "спикер", "другое"
    );

    private final ParticipantRepository participantRepository;
    private final ParticipantImageRepository participantImageRepository;
    private final EventParticipantRepository eventParticipantRepository;
    private final EventImageRepository eventImageRepository;
    private final EventCategoryRepository eventCategoryRepository;
    private final SessionRepository sessionRepository;
    private final TicketTypeRepository ticketTypeRepository;
    private final ImageRepository imageRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<ParticipantSummaryResponse> getPublicList(String q) {
        List<Participant> participants = StringUtils.hasText(q)
            ? participantRepository.findAllByNameContainingIgnoreCaseAndDeletedAtIsNullOrderByNameAsc(q.trim())
            : participantRepository.findAllByDeletedAtIsNullOrderByNameAsc();

        return participants.stream().map(this::toSummary).toList();
    }

    @Transactional(readOnly = true)
    public ParticipantDetailsResponse getPublicById(Long id) {
        Participant participant = participantRepository.findByIdAndDeletedAtIsNull(id)
            .orElseThrow(() -> new ResourceNotFoundException("Participant not found"));

        List<EventShortResponse> events = eventParticipantRepository.findAllByParticipantIdOrderByIdAsc(id).stream()
            .map(EventParticipant::getEvent)
            .filter(event -> event != null && DomainStatusMapper.toEventStatus(event.getStatus()) == EventStatus.PUBLISHED)
            .distinct()
            .map(this::toEventShort)
            .toList();
        List<Long> imageIds = resolveParticipantImageIds(participant.getId());
        Long primaryImageId = imageIds.isEmpty() ? null : imageIds.get(0);

        return ParticipantDetailsResponse.builder()
            .id(participant.getId())
            .name(participant.getName())
            .stageName(participant.getStageName())
            .description(participant.getDescription())
            .genre(participant.getGenre())
            .kind(participant.getKind())
            .imageId(primaryImageId)
            .imageIds(imageIds)
            .primaryImageId(primaryImageId)
            .events(events)
            .build();
    }

    @Transactional
    public ParticipantSummaryResponse create(ParticipantUpsertRequest request, String actorIdentifier) {
        User actor = resolveActor(actorIdentifier);
        assertCanManage(actor);

        Participant participant = participantRepository.save(Participant.builder()
            .name(normalizeRequired(request.getName(), "Participant name is required"))
            .stageName(normalize(request.getStageName()))
            .description(normalize(request.getDescription()))
            .genre(normalize(request.getGenre()))
            .kind(normalizeKind(request.getKind()))
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build());
        applyParticipantImages(participant, request.getImageIds(), request.getPrimaryImageId(), request.getImageId());

        return toSummary(participant);
    }

    @Transactional
    public ParticipantSummaryResponse update(Long id, ParticipantUpsertRequest request, String actorIdentifier) {
        User actor = resolveActor(actorIdentifier);
        assertCanManage(actor);

        Participant participant = participantRepository.findByIdAndDeletedAtIsNull(id)
            .orElseThrow(() -> new ResourceNotFoundException("Participant not found"));

        if (StringUtils.hasText(request.getName())) {
            participant.setName(request.getName().trim());
        }
        if (request.getStageName() != null) {
            participant.setStageName(normalize(request.getStageName()));
        }
        if (request.getDescription() != null) {
            participant.setDescription(normalize(request.getDescription()));
        }
        if (request.getGenre() != null) {
            participant.setGenre(normalize(request.getGenre()));
        }
        if (request.getKind() != null) {
            participant.setKind(normalizeKind(request.getKind()));
        }
        participant.setUpdatedAt(OffsetDateTime.now());
        if (request.getImageId() != null || request.getImageIds() != null || request.getPrimaryImageId() != null) {
            applyParticipantImages(participant, request.getImageIds(), request.getPrimaryImageId(), request.getImageId());
        }

        return toSummary(participantRepository.save(participant));
    }

    @Transactional
    public void delete(Long id, String actorIdentifier) {
        User actor = resolveActor(actorIdentifier);
        assertCanManage(actor);

        Participant participant = participantRepository.findByIdAndDeletedAtIsNull(id)
            .orElseThrow(() -> new ResourceNotFoundException("Participant not found"));

        eventParticipantRepository.deleteByParticipantId(participant.getId());
        participantImageRepository.deleteByParticipantId(participant.getId());

        OffsetDateTime now = OffsetDateTime.now();
        participant.setDeletedAt(now);
        participant.setUpdatedAt(now);
        participantRepository.save(participant);
    }

    @Transactional
    public List<Participant> resolveParticipants(List<String> newParticipantNames, List<Long> participantIds) {
        List<Participant> resolved = participantIds == null || participantIds.isEmpty()
            ? new java.util.ArrayList<>()
            : new java.util.ArrayList<>(participantRepository.findAllById(participantIds));

        if (newParticipantNames != null) {
            for (String rawName : newParticipantNames) {
                if (!StringUtils.hasText(rawName)) {
                    continue;
                }
                String name = rawName.trim();
                Participant participant = participantRepository.save(Participant.builder()
                    .name(name)
                    .kind(DEFAULT_KIND)
                    .createdAt(OffsetDateTime.now())
                    .updatedAt(OffsetDateTime.now())
                    .build());
                resolved.add(participant);
            }
        }

        return resolved;
    }

    private EventShortResponse toEventShort(Event event) {
        List<Session> sessions = sessionRepository.findAllByEventIdOrderByStartsAtAsc(event.getId());
        Session mainSession = resolveMainSession(sessions);
        PriceRange priceRange = extractPriceRange(sessions);
        OffsetDateTime nextSessionAt = nextSessionAt(sessions);

        return EventShortResponse.builder()
            .id(event.getId())
            .title(event.getTitle())
            .shortDescription(event.getShortDescription())
            .ageRating(parseAgeRating(event.getAgeRestriction()))
            .status(DomainStatusMapper.toEventStatus(event.getStatus()))
            .organizationId(event.getOrganization() == null ? null : event.getOrganization().getId())
            .organizationName(event.getOrganization() == null ? null : event.getOrganization().getName())
            .venueId(mainSession != null && mainSession.getVenue() != null ? mainSession.getVenue().getId() : null)
            .venueName(mainSession != null && mainSession.getVenue() != null ? mainSession.getVenue().getName() : null)
            .venueAddress(mainSession != null && mainSession.getVenue() != null ? mainSession.getVenue().getAddress() : mainSession == null ? null : mainSession.getManualAddress())
            .cityId(event.getCity() == null ? null : event.getCity().getId())
            .cityName(event.getCity() == null ? null : event.getCity().getName())
            .createdAt(event.getCreatedAt() == null ? null : event.getCreatedAt().toLocalDateTime())
            .categories(eventCategoryRepository.findAllByEventId(event.getId()).stream()
                .map(EventCategory::getCategory)
                .filter(Objects::nonNull)
                .map(this::toCategoryResponse)
                .toList())
            .nextSessionAt(nextSessionAt == null ? null : nextSessionAt.toLocalDateTime())
            .sessionDates(sessions.stream()
                .map(Session::getStartsAt)
                .filter(Objects::nonNull)
                .map(OffsetDateTime::toLocalDateTime)
                .sorted()
                .toList())
            .coverImageId(resolveEventCoverImageId(event.getId()))
            .free(priceRange.min() == null || priceRange.min().compareTo(BigDecimal.ZERO) <= 0)
            .minPrice(priceRange.min())
            .maxPrice(priceRange.max())
            .registrationOpen(sessions.stream().anyMatch(this::isRegistrationOpen))
            .build();
    }

    private Session resolveMainSession(List<Session> sessions) {
        return sessions.stream()
            .filter(session -> session.getVenue() != null)
            .min(Comparator.comparing(Session::getStartsAt, Comparator.nullsLast(Comparator.naturalOrder())))
            .orElse(sessions.stream().findFirst().orElse(null));
    }

    private OffsetDateTime nextSessionAt(List<Session> sessions) {
        OffsetDateTime now = OffsetDateTime.now();
        return sessions.stream()
            .map(Session::getStartsAt)
            .filter(Objects::nonNull)
            .filter(dateTime -> dateTime.isAfter(now))
            .min(Comparator.naturalOrder())
            .orElse(null);
    }

    private PriceRange extractPriceRange(List<Session> sessions) {
        BigDecimal min = null;
        BigDecimal max = null;

        for (Session session : sessions) {
            TicketType ticketType = defaultTicketType(session.getId());
            BigDecimal price = ticketType == null || ticketType.getPrice() == null ? BigDecimal.ZERO : ticketType.getPrice();
            if (min == null || price.compareTo(min) < 0) {
                min = price;
            }
            if (max == null || price.compareTo(max) > 0) {
                max = price;
            }
        }

        return new PriceRange(min, max);
    }

    private TicketType defaultTicketType(Long sessionId) {
        return ticketTypeRepository.findFirstBySessionIdAndActiveIsTrueOrderByIdAsc(sessionId).orElse(null);
    }

    private boolean isRegistrationOpen(Session session) {
        TicketType type = defaultTicketType(session.getId());
        if (type == null) {
            return false;
        }
        OffsetDateTime now = OffsetDateTime.now();
        if (type.getSalesStartAt() != null && now.isBefore(type.getSalesStartAt())) {
            return false;
        }
        if (type.getSalesEndAt() != null && now.isAfter(type.getSalesEndAt())) {
            return false;
        }
        return true;
    }

    private Long resolveEventCoverImageId(Long eventId) {
        return eventImageRepository.findFirstByEventIdAndPrimaryIsTrueOrderBySortOrderAscIdAsc(eventId)
            .map(EventImage::getImage)
            .map(Image::getId)
            .orElse(null);
    }

    private Integer parseAgeRating(String ageRestriction) {
        if (!StringUtils.hasText(ageRestriction)) {
            return null;
        }
        String digits = ageRestriction.replaceAll("[^0-9]", "");
        if (digits.isBlank()) {
            return null;
        }
        try {
            return Integer.parseInt(digits);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private CategoryResponse toCategoryResponse(Category category) {
        return CategoryResponse.builder()
            .id(category.getId())
            .name(category.getName())
            .description(category.getDescription())
            .build();
    }

    private record PriceRange(BigDecimal min, BigDecimal max) {
    }

    private ParticipantSummaryResponse toSummary(Participant participant) {
        List<Long> imageIds = resolveParticipantImageIds(participant.getId());
        Long primaryImageId = imageIds.isEmpty() ? null : imageIds.get(0);
        return ParticipantSummaryResponse.builder()
            .id(participant.getId())
            .name(participant.getName())
            .stageName(participant.getStageName())
            .description(participant.getDescription())
            .genre(participant.getGenre())
            .kind(participant.getKind())
            .imageId(primaryImageId)
            .imageIds(imageIds)
            .primaryImageId(primaryImageId)
            .build();
    }

    private void applyParticipantImages(Participant participant, List<Long> imageIds, Long primaryImageId, Long legacyImageId) {
        List<Long> requestedIds = null;
        if (imageIds != null) {
            requestedIds = imageIds.stream()
                .filter(Objects::nonNull)
                .collect(java.util.stream.Collectors.toCollection(ArrayList::new));
        } else if (legacyImageId != null) {
            requestedIds = List.of(legacyImageId);
        }

        List<ParticipantImage> existing = participantImageRepository.findAllByParticipantIdOrderByPrimaryDescIdAsc(participant.getId());

        if (requestedIds == null) {
            if (primaryImageId != null) {
                if (existing.isEmpty()) {
                    throw new BadRequestException("Нельзя выбрать главное фото: у участника пока нет изображений");
                }
                Set<Long> existingImageIds = existing.stream()
                    .map(ParticipantImage::getImage)
                    .filter(Objects::nonNull)
                    .map(Image::getId)
                    .collect(java.util.stream.Collectors.toSet());
                if (!existingImageIds.contains(primaryImageId)) {
                    throw new BadRequestException("Главное фото должно входить в набор изображений участника");
                }
                for (ParticipantImage link : existing) {
                    Image image = link.getImage();
                    link.setPrimary(image != null && Objects.equals(image.getId(), primaryImageId));
                }
                participantImageRepository.saveAll(existing);
            }
            return;
        }

        List<Long> uniqueIds = requestedIds.stream()
            .collect(java.util.stream.Collectors.collectingAndThen(
                java.util.stream.Collectors.toCollection(LinkedHashSet::new),
                ArrayList::new
            ));

        participantImageRepository.deleteByParticipantId(participant.getId());
        participantImageRepository.flush();
        if (uniqueIds.isEmpty()) {
            return;
        }

        List<Image> images = imageRepository.findAllById(uniqueIds);
        if (images.size() != uniqueIds.size()) {
            throw new ResourceNotFoundException("Image not found");
        }
        java.util.Map<Long, Image> imagesById = images.stream()
            .collect(java.util.stream.Collectors.toMap(Image::getId, java.util.function.Function.identity()));

        Long primaryResolved = primaryImageId;
        if (primaryResolved == null || !imagesById.containsKey(primaryResolved)) {
            primaryResolved = uniqueIds.get(0);
        }

        List<ParticipantImage> links = new ArrayList<>();
        for (Long id : uniqueIds) {
            Image image = imagesById.get(id);
            links.add(ParticipantImage.builder()
                .participant(participant)
                .image(image)
                .primary(Objects.equals(id, primaryResolved))
                .build());
        }
        participantImageRepository.saveAll(links);
    }

    private Image resolveImage(Long imageId) {
        if (imageId != null) {
            return imageRepository.findById(imageId)
                .orElseThrow(() -> new ResourceNotFoundException("Image not found"));
        }
        return null;
    }

    private List<Long> resolveParticipantImageIds(Long participantId) {
        return participantImageRepository.findAllByParticipantIdOrderByPrimaryDescIdAsc(participantId).stream()
            .map(ParticipantImage::getImage)
            .filter(Objects::nonNull)
            .map(Image::getId)
            .toList();
    }

    private User resolveActor(String actorIdentifier) {
        return userRepository.findByLoginOrEmailWithRoles(actorIdentifier)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private void assertCanManage(User actor) {
        boolean canManage = actor.getUserRoles().stream().anyMatch(userRole -> {
            RoleName roleName = userRole.getRole().toRoleName();
            return roleName == RoleName.ROLE_ORGANIZER || roleName == RoleName.ROLE_ADMIN;
        });

        if (!canManage) {
            throw new BadRequestException("Недостаточно прав");
        }
    }

    private String normalizeRequired(String value, String message) {
        if (!StringUtils.hasText(value)) {
            throw new BadRequestException(message);
        }
        return value.trim();
    }

    private String normalize(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }

    private String normalizeKind(String value) {
        if (!StringUtils.hasText(value)) {
            return DEFAULT_KIND;
        }
        String trimmed = value.trim().toLowerCase();
        if (!ALLOWED_KINDS.contains(trimmed)) {
            throw new BadRequestException("Недопустимый тип участника: " + value);
        }
        return trimmed;
    }
}
