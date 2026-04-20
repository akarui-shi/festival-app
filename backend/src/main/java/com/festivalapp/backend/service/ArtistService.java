package com.festivalapp.backend.service;

import com.festivalapp.backend.dto.ArtistDetailsResponse;
import com.festivalapp.backend.dto.ArtistSummaryResponse;
import com.festivalapp.backend.dto.ArtistUpsertRequest;
import com.festivalapp.backend.dto.CategoryResponse;
import com.festivalapp.backend.dto.EventShortResponse;
import com.festivalapp.backend.entity.Artist;
import com.festivalapp.backend.entity.ArtistImage;
import com.festivalapp.backend.entity.Category;
import com.festivalapp.backend.entity.Event;
import com.festivalapp.backend.entity.EventArtist;
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
import com.festivalapp.backend.repository.ArtistImageRepository;
import com.festivalapp.backend.repository.ArtistRepository;
import com.festivalapp.backend.repository.EventCategoryRepository;
import com.festivalapp.backend.repository.EventArtistRepository;
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
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class ArtistService {

    private final ArtistRepository artistRepository;
    private final ArtistImageRepository artistImageRepository;
    private final EventArtistRepository eventArtistRepository;
    private final EventImageRepository eventImageRepository;
    private final EventCategoryRepository eventCategoryRepository;
    private final SessionRepository sessionRepository;
    private final TicketTypeRepository ticketTypeRepository;
    private final ImageRepository imageRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<ArtistSummaryResponse> getPublicList(String q) {
        List<Artist> artists = StringUtils.hasText(q)
            ? artistRepository.findAllByNameContainingIgnoreCaseAndDeletedAtIsNullOrderByNameAsc(q.trim())
            : artistRepository.findAllByDeletedAtIsNullOrderByNameAsc();

        return artists.stream().map(this::toSummary).toList();
    }

    @Transactional(readOnly = true)
    public ArtistDetailsResponse getPublicById(Long id) {
        Artist artist = artistRepository.findByIdAndDeletedAtIsNull(id)
            .orElseThrow(() -> new ResourceNotFoundException("Artist not found"));

        List<EventShortResponse> events = eventArtistRepository.findAllByArtistIdOrderByDisplayOrderAscIdAsc(id).stream()
            .map(EventArtist::getEvent)
            .filter(event -> event != null && DomainStatusMapper.toEventStatus(event.getStatus()) == EventStatus.PUBLISHED)
            .distinct()
            .map(this::toEventShort)
            .toList();

        return ArtistDetailsResponse.builder()
            .id(artist.getId())
            .name(artist.getName())
            .stageName(artist.getStageName())
            .description(artist.getDescription())
            .genre(artist.getGenre())
            .imageUrl(resolveArtistImageUrl(artist.getId()))
            .events(events)
            .build();
    }

    @Transactional
    public ArtistSummaryResponse create(ArtistUpsertRequest request, String actorIdentifier) {
        User actor = resolveActor(actorIdentifier);
        assertCanManage(actor);

        Artist artist = artistRepository.save(Artist.builder()
            .name(normalizeRequired(request.getName(), "Artist name is required"))
            .stageName(normalize(request.getStageName()))
            .description(normalize(request.getDescription()))
            .genre(normalize(request.getGenre()))
            .moderationStatus("на_рассмотрении")
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build());
        applyArtistImage(artist, request.getImageId(), request.getImageUrl());

        return toSummary(artist);
    }

    @Transactional
    public ArtistSummaryResponse update(Long id, ArtistUpsertRequest request, String actorIdentifier) {
        User actor = resolveActor(actorIdentifier);
        assertCanManage(actor);

        Artist artist = artistRepository.findByIdAndDeletedAtIsNull(id)
            .orElseThrow(() -> new ResourceNotFoundException("Artist not found"));

        if (StringUtils.hasText(request.getName())) {
            artist.setName(request.getName().trim());
        }
        if (request.getStageName() != null) {
            artist.setStageName(normalize(request.getStageName()));
        }
        if (request.getDescription() != null) {
            artist.setDescription(normalize(request.getDescription()));
        }
        if (request.getGenre() != null) {
            artist.setGenre(normalize(request.getGenre()));
        }
        artist.setUpdatedAt(OffsetDateTime.now());
        if (request.getImageId() != null || StringUtils.hasText(request.getImageUrl())) {
            applyArtistImage(artist, request.getImageId(), request.getImageUrl());
        }

        return toSummary(artistRepository.save(artist));
    }

    @Transactional
    public List<Artist> resolveArtists(List<String> newArtistNames, List<Long> artistIds) {
        List<Artist> resolved = artistIds == null || artistIds.isEmpty()
            ? new java.util.ArrayList<>()
            : new java.util.ArrayList<>(artistRepository.findAllById(artistIds));

        if (newArtistNames != null) {
            for (String rawName : newArtistNames) {
                if (!StringUtils.hasText(rawName)) {
                    continue;
                }
                String name = rawName.trim();
                Artist artist = artistRepository.save(Artist.builder()
                    .name(name)
                    .moderationStatus("на_рассмотрении")
                    .createdAt(OffsetDateTime.now())
                    .updatedAt(OffsetDateTime.now())
                    .build());
                resolved.add(artist);
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
            .coverUrl(resolveEventCoverUrl(event.getId()))
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

    private String resolveEventCoverUrl(Long eventId) {
        return eventImageRepository.findFirstByEventIdAndPrimaryIsTrueOrderBySortOrderAscIdAsc(eventId)
            .map(EventImage::getImage)
            .map(Image::getFileUrl)
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

    private ArtistSummaryResponse toSummary(Artist artist) {
        return ArtistSummaryResponse.builder()
            .id(artist.getId())
            .name(artist.getName())
            .stageName(artist.getStageName())
            .description(artist.getDescription())
            .genre(artist.getGenre())
            .imageUrl(resolveArtistImageUrl(artist.getId()))
            .build();
    }

    private void applyArtistImage(Artist artist, Long imageId, String imageUrl) {
        Image image = resolveImage(imageId, imageUrl);
        if (image == null) {
            return;
        }
        artistImageRepository.deleteByArtistId(artist.getId());
        artistImageRepository.save(ArtistImage.builder()
            .artist(artist)
            .image(image)
            .primary(true)
            .build());
    }

    private Image resolveImage(Long imageId, String imageUrl) {
        if (imageId != null) {
            return imageRepository.findById(imageId)
                .orElseThrow(() -> new ResourceNotFoundException("Image not found"));
        }
        Long parsed = extractImageIdFromUrl(imageUrl);
        if (parsed != null) {
            return imageRepository.findById(parsed)
                .orElseThrow(() -> new ResourceNotFoundException("Image not found"));
        }
        return null;
    }

    private Long extractImageIdFromUrl(String imageUrl) {
        if (!StringUtils.hasText(imageUrl)) {
            return null;
        }
        String normalized = imageUrl.trim();
        int slash = normalized.lastIndexOf('/');
        if (slash < 0 || slash == normalized.length() - 1) {
            return null;
        }
        String tail = normalized.substring(slash + 1);
        try {
            return Long.parseLong(tail);
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private String resolveArtistImageUrl(Long artistId) {
        return artistImageRepository.findFirstByArtistIdAndPrimaryIsTrueOrderByIdAsc(artistId)
            .map(ArtistImage::getImage)
            .map(Image::getFileUrl)
            .orElse(null);
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
}
