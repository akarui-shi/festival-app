package com.festivalapp.backend.service;

import com.festivalapp.backend.dto.CategoryResponse;
import com.festivalapp.backend.dto.EventCreateRequest;
import com.festivalapp.backend.dto.EventDetailsResponse;
import com.festivalapp.backend.dto.EventImageRequest;
import com.festivalapp.backend.dto.EventImageResponse;
import com.festivalapp.backend.dto.EventShortResponse;
import com.festivalapp.backend.dto.ArtistSummaryResponse;
import com.festivalapp.backend.dto.SessionShortResponse;
import com.festivalapp.backend.dto.EventUpdateRequest;
import com.festivalapp.backend.dto.OrganizationPublicResponse;
import com.festivalapp.backend.dto.OrganizerEventStatsResponse;
import com.festivalapp.backend.dto.VenueResponse;
import com.festivalapp.backend.entity.Artist;
import com.festivalapp.backend.entity.Category;
import com.festivalapp.backend.entity.City;
import com.festivalapp.backend.entity.Event;
import com.festivalapp.backend.entity.EventArtist;
import com.festivalapp.backend.entity.EventCategory;
import com.festivalapp.backend.entity.EventImage;
import com.festivalapp.backend.entity.EventStatus;
import com.festivalapp.backend.entity.Image;
import com.festivalapp.backend.entity.Organization;
import com.festivalapp.backend.entity.OrganizationMember;
import com.festivalapp.backend.entity.Session;
import com.festivalapp.backend.entity.TicketType;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.entity.Venue;
import com.festivalapp.backend.repository.ArtistRepository;
import com.festivalapp.backend.exception.BadRequestException;
import com.festivalapp.backend.exception.ResourceNotFoundException;
import com.festivalapp.backend.repository.CategoryRepository;
import com.festivalapp.backend.repository.CityRepository;
import com.festivalapp.backend.repository.CommentRepository;
import com.festivalapp.backend.repository.EventArtistRepository;
import com.festivalapp.backend.repository.EventCategoryRepository;
import com.festivalapp.backend.repository.EventImageRepository;
import com.festivalapp.backend.repository.EventRepository;
import com.festivalapp.backend.repository.FavoriteRepository;
import com.festivalapp.backend.repository.ImageRepository;
import com.festivalapp.backend.repository.OrganizationMemberRepository;
import com.festivalapp.backend.repository.OrganizationImageRepository;
import com.festivalapp.backend.repository.OrganizationRepository;
import com.festivalapp.backend.repository.SessionRepository;
import com.festivalapp.backend.repository.TicketRepository;
import com.festivalapp.backend.repository.TicketTypeRepository;
import com.festivalapp.backend.repository.UserRepository;
import com.festivalapp.backend.repository.VenueRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EventService {

    private final EventRepository eventRepository;
    private final EventCategoryRepository eventCategoryRepository;
    private final EventArtistRepository eventArtistRepository;
    private final ArtistRepository artistRepository;
    private final CategoryRepository categoryRepository;
    private final SessionRepository sessionRepository;
    private final EventImageRepository eventImageRepository;
    private final ImageRepository imageRepository;
    private final CityRepository cityRepository;
    private final VenueRepository venueRepository;
    private final OrganizationRepository organizationRepository;
    private final OrganizationImageRepository organizationImageRepository;
    private final OrganizationMemberRepository organizationMemberRepository;
    private final UserRepository userRepository;
    private final FavoriteRepository favoriteRepository;
    private final CommentRepository commentRepository;
    private final TicketRepository ticketRepository;
    private final TicketTypeRepository ticketTypeRepository;

    @Transactional(readOnly = true)
    public List<EventShortResponse> getAll(String title,
                                           String q,
                                           Long categoryId,
                                           Long venueId,
                                           Long cityId,
                                           Long organizationId,
                                           LocalDate date,
                                           LocalDate dateFrom,
                                           LocalDate dateTo,
                                           String participationType,
                                           BigDecimal priceFrom,
                                           BigDecimal priceTo,
                                           Boolean registrationOpen,
                                           String status,
                                           String sortBy,
                                           String sortDir) {
        List<Event> events = eventRepository.findAllByDeletedAtIsNullOrderByCreatedAtDesc();

        return events.stream()
            .map(this::hydrateEvent)
            .filter(event -> matchesFilters(
                event,
                title,
                q,
                categoryId,
                venueId,
                cityId,
                organizationId,
                date,
                dateFrom,
                dateTo,
                participationType,
                priceFrom,
                priceTo,
                registrationOpen,
                status
            ))
            .sorted(resolveSort(sortBy, sortDir))
            .map(this::toShortResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<EventShortResponse> getRecommendations(String actorIdentifier, Long cityId, Integer limit) {
        int safeLimit = limit == null || limit <= 0 ? 8 : Math.min(limit, 50);
        List<Event> events = eventRepository.findAllByDeletedAtIsNullOrderByCreatedAtDesc().stream()
            .map(this::hydrateEvent)
            .filter(e -> cityId == null || (e.getCity() != null && Objects.equals(e.getCity().getId(), cityId)))
            .filter(e -> DomainStatusMapper.toEventStatus(e.getStatus()) == EventStatus.PUBLISHED)
            .sorted(Comparator.comparingLong((Event event) -> favoriteRepository.countByEventId(event.getId())).reversed()
                .thenComparing(Event::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
            .limit(safeLimit)
            .toList();

        return events.stream().map(this::toShortResponse).toList();
    }

    @Transactional(readOnly = true)
    public OrganizationPublicResponse getOrganizationProfile(Long organizationId) {
        Organization organization = organizationRepository.findByIdAndDeletedAtIsNull(organizationId)
            .orElseThrow(() -> new ResourceNotFoundException("Organization not found"));

        return OrganizationPublicResponse.builder()
            .id(organization.getId())
            .name(organization.getName())
            .description(organization.getDescription())
            .contacts(organization.getContacts())
            .contactEmail(organization.getContactEmail())
            .contactPhone(organization.getContactPhone())
            .website(organization.getWebsite())
            .socialLinks(organization.getSocialLinks())
            .logoImageId(resolveOrganizationLogoImageId(organization.getId()))
            .build();
    }

    @Transactional(readOnly = true)
    public List<EventShortResponse> getPublicByOrganization(Long organizationId) {
        return eventRepository.findAllByOrganizationIdAndDeletedAtIsNullOrderByCreatedAtDesc(organizationId).stream()
            .map(this::hydrateEvent)
            .filter(event -> DomainStatusMapper.toEventStatus(event.getStatus()) == EventStatus.PUBLISHED)
            .map(this::toShortResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public EventDetailsResponse getById(Long id) {
        Event event = hydrateEvent(loadEvent(id));
        return toDetailsResponse(event);
    }

    @Transactional(readOnly = true)
    public EventDetailsResponse getOrganizerEventById(Long id, String actorIdentifier) {
        User actor = resolveActor(actorIdentifier);
        Event event = hydrateEvent(loadEvent(id));
        assertCanManageEvent(actor, event);
        return toDetailsResponse(event);
    }

    @Transactional(readOnly = true)
    public OrganizerEventStatsResponse getOrganizerEventStats(Long id, String actorIdentifier) {
        User actor = resolveActor(actorIdentifier);
        Event event = hydrateEvent(loadEvent(id));
        assertCanManageEvent(actor, event);

        List<Session> sessions = sessionRepository.findAllByEventIdOrderByStartsAtAsc(event.getId());
        List<OrganizerEventStatsResponse.SessionStats> sessionStats = new ArrayList<>();

        int totalCapacity = 0;
        int occupied = 0;

        for (Session session : sessions) {
            int capacity = session.getSeatLimit() == null ? 0 : session.getSeatLimit();
            long occupiedForSession = ticketRepository.countBySessionIdAndStatus(session.getId(), "активен");
            int occupancyPercent = capacity > 0 ? (int) Math.round((occupiedForSession * 100.0) / capacity) : 0;
            totalCapacity += capacity;
            occupied += (int) occupiedForSession;

            sessionStats.add(OrganizerEventStatsResponse.SessionStats.builder()
                .sessionId(session.getId())
                .startAt(session.getStartsAt() == null ? null : session.getStartsAt().toLocalDateTime())
                .endAt(session.getEndsAt() == null ? null : session.getEndsAt().toLocalDateTime())
                .capacity(capacity)
                .occupiedSeats((int) occupiedForSession)
                .occupancyPercent(occupancyPercent)
                .build());
        }

        int eventOccupancy = totalCapacity > 0 ? (int) Math.round((occupied * 100.0) / totalCapacity) : 0;

        long cancelled = 0;
        for (Session session : sessions) {
            cancelled += ticketRepository.findAllBySessionIdOrderByIssuedAtDesc(session.getId()).stream()
                .filter(t -> "возвращён".equals(t.getStatus()))
                .count();
        }

        return OrganizerEventStatsResponse.builder()
            .eventId(event.getId())
            .registrationsCount(occupied)
            .cancellationsCount(cancelled)
            .occupiedSeats(occupied)
            .totalCapacity(totalCapacity)
            .occupancyPercent(eventOccupancy)
            .sessions(sessionStats)
            .build();
    }

    @Transactional(readOnly = true)
    public List<EventShortResponse> getOrganizerEvents(String actorIdentifier) {
        User actor = resolveActor(actorIdentifier);
        List<OrganizationMember> memberships = organizationMemberRepository.findAllByUserIdAndLeftAtIsNull(actor.getId()).stream()
            .filter(member -> member.getOrganization() != null && member.getOrganization().getDeletedAt() == null)
            .toList();

        if (memberships.isEmpty()) {
            return List.of();
        }

        Set<Long> seen = new LinkedHashSet<>();
        List<Event> events = new ArrayList<>();
        for (OrganizationMember membership : memberships) {
            for (Event event : eventRepository.findAllByOrganizationIdAndDeletedAtIsNullOrderByCreatedAtDesc(
                membership.getOrganization().getId()
            )) {
                if (seen.add(event.getId())) {
                    events.add(event);
                }
            }
        }

        events.sort(Comparator.comparing(Event::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())));
        return events.stream()
            .map(this::hydrateEvent)
            .map(this::toShortResponse)
            .toList();
    }

    @Transactional
    public EventShortResponse create(EventCreateRequest request, String actorIdentifier) {
        User actor = resolveActor(actorIdentifier);
        Organization organization = resolveManagedOrganization(actor);

        OffsetDateTime now = OffsetDateTime.now();
        City city = resolveCityForEvent(request, organization);
        Venue venue = resolveVenueForEvent(request);

        Event event = Event.builder()
            .organization(organization)
            .createdByUser(actor)
            .city(city)
            .title(normalizeRequired(request.getTitle(), "Название обязательно"))
            .shortDescription(normalizeOptional(request.getShortDescription()))
            .fullDescription(normalizeOptional(request.getFullDescription()))
            .ageRestriction(formatAgeRestriction(request.getAgeRating()))
            .free(true)
            .startsAt(now)
            .endsAt(now.plusHours(2))
            .status("черновик")
            .createdAt(now)
            .updatedAt(now)
            .build();

        Event saved = eventRepository.save(event);
        updateEventCategories(saved, request.getCategoryIds());
        updateEventImages(saved, request.getEventImages());
        updateEventArtists(saved, request.getArtistIds(), request.getNewArtistNames());

        if (venue != null) {
            ensureSessionForVenue(saved, venue, now);
        }

        return toShortResponse(hydrateEvent(saved));
    }

    @Transactional
    public EventShortResponse update(Long id, EventUpdateRequest request, String actorIdentifier) {
        User actor = resolveActor(actorIdentifier);
        Event event = loadEvent(id);
        assertCanManageEvent(actor, event);

        if (StringUtils.hasText(request.getTitle())) {
            event.setTitle(request.getTitle().trim());
        }
        if (request.getShortDescription() != null) {
            event.setShortDescription(normalizeOptional(request.getShortDescription()));
        }
        if (request.getFullDescription() != null) {
            event.setFullDescription(normalizeOptional(request.getFullDescription()));
        }
        if (request.getAgeRating() != null) {
            event.setAgeRestriction(formatAgeRestriction(request.getAgeRating()));
        }

        City resolvedCity = resolveCityForEvent(request, event.getOrganization());
        if (resolvedCity != null) {
            event.setCity(resolvedCity);
        }

        event.setUpdatedAt(OffsetDateTime.now());
        Event saved = eventRepository.save(event);

        if (request.getCategoryIds() != null) {
            updateEventCategories(saved, request.getCategoryIds());
        }
        if (request.getEventImages() != null) {
            updateEventImages(saved, request.getEventImages());
        }
        if (request.getArtistIds() != null || request.getNewArtistNames() != null) {
            updateEventArtists(saved, request.getArtistIds(), request.getNewArtistNames());
        }

        if (request.getVenueId() != null) {
            Venue venue = venueRepository.findById(request.getVenueId())
                .orElseThrow(() -> new ResourceNotFoundException("Venue not found"));
            upsertSessionVenue(saved, venue);
        }

        return toShortResponse(hydrateEvent(saved));
    }

    @Transactional
    public Map<String, Object> archive(Long id, String actorIdentifier) {
        User actor = resolveActor(actorIdentifier);
        Event event = loadEvent(id);
        assertCanManageEvent(actor, event);
        event.setStatus("завершено");
        event.setUpdatedAt(OffsetDateTime.now());
        eventRepository.save(event);
        return Map.of("success", true);
    }

    @Transactional(readOnly = true)
    public List<EventShortResponse> getAllForAdmin(EventStatus status) {
        return eventRepository.findAllByDeletedAtIsNullOrderByCreatedAtDesc().stream()
            .map(this::hydrateEvent)
            .filter(event -> {
                EventStatus resolved = DomainStatusMapper.toEventStatus(event.getStatus());
                if (resolved == EventStatus.DRAFT) {
                    return false;
                }
                return status == null || resolved == status;
            })
            .map(this::toShortResponse)
            .toList();
    }

    @Transactional
    public EventShortResponse updateStatusByAdmin(Long eventId, EventStatus status) {
        Event event = loadEvent(eventId);
        event.setStatus(DomainStatusMapper.toEventDbStatus(status == null ? EventStatus.DRAFT : status));
        event.setUpdatedAt(OffsetDateTime.now());
        return toShortResponse(hydrateEvent(eventRepository.save(event)));
    }

    @Transactional
    public Map<String, Object> delete(Long id, String actorIdentifier) {
        User actor = resolveActor(actorIdentifier);
        Event event = loadEvent(id);
        assertCanManageEvent(actor, event);
        event.setDeletedAt(OffsetDateTime.now());
        event.setUpdatedAt(OffsetDateTime.now());
        eventRepository.save(event);
        return Map.of("success", true);
    }

    private Event hydrateEvent(Event event) {
        List<EventCategory> categories = eventCategoryRepository.findAllByEventId(event.getId());
        event.getEventCategories().clear();
        event.getEventCategories().addAll(categories);

        List<EventImage> images = eventImageRepository.findAllByEventIdOrderBySortOrderAscIdAsc(event.getId());
        event.getEventImages().clear();
        event.getEventImages().addAll(images);

        event.setAgeRating(parseAgeRating(event.getAgeRestriction()));
        event.setCoverImageId(images.stream().filter(EventImage::isPrimary)
            .findFirst()
            .map(img -> img.getImage() == null ? null : img.getImage().getId())
            .orElse(images.stream().findFirst().map(img -> img.getImage() == null ? null : img.getImage().getId()).orElse(null)));

        event.getSessions().clear();
        event.getSessions().addAll(sessionRepository.findAllByEventIdOrderByStartsAtAsc(event.getId()));
        return event;
    }

    private boolean matchesFilters(Event event,
                                   String title,
                                   String q,
                                   Long categoryId,
                                   Long venueId,
                                   Long cityId,
                                   Long organizationId,
                                   LocalDate date,
                                   LocalDate dateFrom,
                                   LocalDate dateTo,
                                   String participationType,
                                   BigDecimal priceFrom,
                                   BigDecimal priceTo,
                                   Boolean registrationOpen,
                                   String status) {
        String searchQuery = StringUtils.hasText(q) ? q.trim() : (StringUtils.hasText(title) ? title.trim() : null);
        if (StringUtils.hasText(searchQuery)) {
            String searchable = buildSearchableText(event);
            for (String term : searchQuery.toLowerCase().split("\\s+")) {
                if (!searchable.contains(term)) {
                    return false;
                }
            }
        }

        if (categoryId != null) {
            boolean hasCategory = event.getEventCategories().stream()
                .map(EventCategory::getCategory)
                .filter(Objects::nonNull)
                .anyMatch(category -> Objects.equals(category.getId(), categoryId));
            if (!hasCategory) {
                return false;
            }
        }

        if (venueId != null) {
            boolean hasVenue = event.getSessions().stream()
                .anyMatch(session -> session.getVenue() != null && Objects.equals(session.getVenue().getId(), venueId));
            if (!hasVenue) {
                return false;
            }
        }

        if (cityId != null && (event.getCity() == null || !Objects.equals(event.getCity().getId(), cityId))) {
            return false;
        }

        if (organizationId != null && (event.getOrganization() == null || !Objects.equals(event.getOrganization().getId(), organizationId))) {
            return false;
        }

        if (StringUtils.hasText(status)) {
            EventStatus requested = parseEventStatus(status);
            if (requested != null && DomainStatusMapper.toEventStatus(event.getStatus()) != requested) {
                return false;
            }
        } else if (DomainStatusMapper.toEventStatus(event.getStatus()) != EventStatus.PUBLISHED) {
            return false;
        }

        if (StringUtils.hasText(participationType)) {
            String normalizedType = participationType.trim().toLowerCase();
            boolean hasMatchingType = event.getSessions().stream().anyMatch(session -> {
                TicketType pricing = defaultTicketType(session.getId());
                if ("free".equals(normalizedType) || "бесплатно".equals(normalizedType)) {
                    return pricing == null || pricing.getPrice() == null || pricing.getPrice().compareTo(BigDecimal.ZERO) <= 0;
                }
                if ("paid".equals(normalizedType) || "платно".equals(normalizedType)) {
                    return pricing != null && pricing.getPrice() != null && pricing.getPrice().compareTo(BigDecimal.ZERO) > 0;
                }
                return true;
            });
            if (!hasMatchingType) {
                return false;
            }
        }

        if (priceFrom != null || priceTo != null) {
            boolean hasPriceInRange = event.getSessions().stream().anyMatch(session -> {
                TicketType pricing = defaultTicketType(session.getId());
                BigDecimal sessionPrice = pricing == null || pricing.getPrice() == null ? BigDecimal.ZERO : pricing.getPrice();
                if (priceFrom != null && sessionPrice.compareTo(priceFrom) < 0) {
                    return false;
                }
                if (priceTo != null && sessionPrice.compareTo(priceTo) > 0) {
                    return false;
                }
                return true;
            });
            if (!hasPriceInRange) {
                return false;
            }
        }

        if (registrationOpen != null) {
            boolean hasRegistrationState = event.getSessions().stream().anyMatch(session -> isRegistrationOpen(session) == registrationOpen);
            if (!hasRegistrationState) {
                return false;
            }
        }

        if (date != null) {
            boolean hasDate = event.getSessions().stream().anyMatch(session ->
                session.getStartsAt() != null && session.getStartsAt().toLocalDate().equals(date)
            );
            if (!hasDate) {
                return false;
            }
        }

        if (dateFrom != null || dateTo != null) {
            OffsetDateTime from = dateFrom == null ? OffsetDateTime.MIN : dateFrom.atStartOfDay().atOffset(ZoneOffset.UTC);
            OffsetDateTime to = dateTo == null ? OffsetDateTime.MAX : dateTo.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);
            boolean inRange = event.getSessions().stream().anyMatch(session -> session.getStartsAt() != null
                && !session.getStartsAt().isBefore(from)
                && session.getStartsAt().isBefore(to));
            if (!inRange) {
                return false;
            }
        }

        return true;
    }

    private String buildSearchableText(Event event) {
        List<String> chunks = new ArrayList<>();
        if (StringUtils.hasText(event.getTitle())) {
            chunks.add(event.getTitle());
        }
        if (StringUtils.hasText(event.getShortDescription())) {
            chunks.add(event.getShortDescription());
        }
        if (event.getOrganization() != null && StringUtils.hasText(event.getOrganization().getName())) {
            chunks.add(event.getOrganization().getName());
        }

        for (EventArtist eventArtist : eventArtistRepository.findAllByEventIdOrderByIdAsc(event.getId())) {
            Artist artist = eventArtist.getArtist();
            if (artist == null) {
                continue;
            }
            if (StringUtils.hasText(artist.getName())) {
                chunks.add(artist.getName());
            }
            if (StringUtils.hasText(artist.getStageName())) {
                chunks.add(artist.getStageName());
            }
        }

        return String.join(" ", chunks).toLowerCase();
    }

    private Comparator<Event> resolveSort(String sortBy, String sortDir) {
        Comparator<Event> comparator;
        if ("title".equalsIgnoreCase(sortBy)) {
            comparator = Comparator.comparing(Event::getTitle, Comparator.nullsLast(String::compareToIgnoreCase));
        } else if ("nextSessionAt".equalsIgnoreCase(sortBy)) {
            comparator = Comparator.comparing(this::nextSessionAt, Comparator.nullsLast(Comparator.naturalOrder()));
        } else {
            comparator = Comparator.comparing(Event::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder()));
        }

        return "asc".equalsIgnoreCase(sortDir) ? comparator : comparator.reversed();
    }

    private OffsetDateTime nextSessionAt(Event event) {
        OffsetDateTime now = OffsetDateTime.now();
        return event.getSessions().stream()
            .map(Session::getStartsAt)
            .filter(Objects::nonNull)
            .filter(dateTime -> dateTime.isAfter(now))
            .min(Comparator.naturalOrder())
            .orElse(null);
    }

    private EventShortResponse toShortResponse(Event event) {
        Session mainSession = event.getSessions().stream()
            .filter(session -> session.getVenue() != null)
            .min(Comparator.comparing(Session::getStartsAt, Comparator.nullsLast(Comparator.naturalOrder())))
            .orElse(event.getSessions().stream().findFirst().orElse(null));
        PriceRange priceRange = extractPriceRange(event.getSessions());
        boolean registrationOpen = event.getSessions().stream().anyMatch(this::isRegistrationOpen);
        List<ArtistSummaryResponse> artists = mapArtists(event.getId());
        City resolvedCity = event.getCity();
        if (resolvedCity == null) {
            resolvedCity = event.getSessions().stream()
                .map(Session::getVenue)
                .filter(Objects::nonNull)
                .map(Venue::getCity)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(null);
        }
        long sessionsCount = event.getSessions().size();
        long registrationsCount = event.getSessions().stream()
            .map(Session::getId)
            .filter(Objects::nonNull)
            .mapToLong(sessionId -> ticketRepository.countBySessionIdAndStatus(sessionId, "активен"))
            .sum();

        return EventShortResponse.builder()
            .id(event.getId())
            .title(event.getTitle())
            .shortDescription(event.getShortDescription())
            .ageRating(event.getAgeRating())
            .createdAt(event.getCreatedAt() == null ? null : event.getCreatedAt().toLocalDateTime())
            .status(DomainStatusMapper.toEventStatus(event.getStatus()))
            .organizationId(event.getOrganization() == null ? null : event.getOrganization().getId())
            .organizationName(event.getOrganization() == null ? null : event.getOrganization().getName())
            .venueId(mainSession != null && mainSession.getVenue() != null ? mainSession.getVenue().getId() : null)
            .venueName(mainSession != null && mainSession.getVenue() != null ? mainSession.getVenue().getName() : null)
            .venueAddress(mainSession != null && mainSession.getVenue() != null ? mainSession.getVenue().getAddress() : mainSession == null ? null : mainSession.getManualAddress())
            .cityId(resolvedCity == null ? null : resolvedCity.getId())
            .cityName(resolvedCity == null ? null : resolvedCity.getName())
            .categories(event.getEventCategories().stream()
                .map(EventCategory::getCategory)
                .filter(Objects::nonNull)
                .map(this::toCategoryResponse)
                .toList())
            .nextSessionAt(nextSessionAt(event) == null ? null : nextSessionAt(event).toLocalDateTime())
            .sessionDates(event.getSessions().stream()
                .map(Session::getStartsAt)
                .filter(Objects::nonNull)
                .map(OffsetDateTime::toLocalDateTime)
                .sorted()
                .toList())
            .coverImageId(event.getCoverImageId())
            .free(priceRange.min() == null || priceRange.min().compareTo(BigDecimal.ZERO) <= 0)
            .minPrice(priceRange.min())
            .maxPrice(priceRange.max())
            .registrationOpen(registrationOpen)
            .sessionsCount(sessionsCount)
            .registrationsCount(registrationsCount)
            .artists(artists)
            .build();
    }

    private EventDetailsResponse toDetailsResponse(Event event) {
        Session mainSession = event.getSessions().stream()
            .filter(session -> session.getVenue() != null)
            .min(Comparator.comparing(Session::getStartsAt, Comparator.nullsLast(Comparator.naturalOrder())))
            .orElse(event.getSessions().stream().findFirst().orElse(null));

        VenueResponse venueResponse = mainSession == null ? null : toVenueResponse(mainSession);
        List<SessionShortResponse> sessions = event.getSessions().stream()
            .sorted(Comparator.comparing(Session::getStartsAt, Comparator.nullsLast(Comparator.naturalOrder())))
            .map(this::toSessionShortResponse)
            .toList();
        PriceRange priceRange = extractPriceRange(event.getSessions());
        boolean registrationOpen = event.getSessions().stream().anyMatch(this::isRegistrationOpen);

        return EventDetailsResponse.builder()
            .id(event.getId())
            .title(event.getTitle())
            .shortDescription(event.getShortDescription())
            .fullDescription(event.getFullDescription())
            .ageRating(event.getAgeRating())
            .createdAt(event.getCreatedAt() == null ? null : event.getCreatedAt().toLocalDateTime())
            .status(DomainStatusMapper.toEventStatus(event.getStatus()))
            .coverImageId(event.getCoverImageId())
            .eventImages(event.getEventImages().stream().map(this::toEventImageResponse).toList())
            .organization(EventDetailsResponse.OrganizationSummary.builder()
                .id(event.getOrganization() == null ? null : event.getOrganization().getId())
                .name(event.getOrganization() == null ? null : event.getOrganization().getName())
                .description(event.getOrganization() == null ? null : event.getOrganization().getDescription())
                .contacts(event.getOrganization() == null ? null : event.getOrganization().getContacts())
                .build())
            .venue(venueResponse)
            .categories(event.getEventCategories().stream()
                .map(EventCategory::getCategory)
                .filter(Objects::nonNull)
                .map(this::toCategoryResponse)
                .toList())
            .artists(mapArtists(event.getId()))
            .sessions(sessions)
            .free(priceRange.min() == null || priceRange.min().compareTo(BigDecimal.ZERO) <= 0)
            .minPrice(priceRange.min())
            .maxPrice(priceRange.max())
            .registrationOpen(registrationOpen)
            .build();
    }

    private VenueResponse toVenueResponse(Session session) {
        if (session.getVenue() == null) {
            return VenueResponse.builder()
                .id(null)
                .name(session.getSessionTitle())
                .address(session.getManualAddress())
                .latitude(session.getLatitude())
                .longitude(session.getLongitude())
                .capacity(session.getSeatLimit())
                .build();
        }

        Venue venue = session.getVenue();
        return VenueResponse.builder()
            .id(venue.getId())
            .name(venue.getName())
            .address(venue.getAddress())
            .contacts(venue.getContacts())
            .latitude(venue.getLatitude())
            .longitude(venue.getLongitude())
            .capacity(venue.getCapacity())
            .cityId(venue.getCity() == null ? null : venue.getCity().getId())
            .cityName(venue.getCity() == null ? null : venue.getCity().getName())
            .build();
    }

    private EventImageResponse toEventImageResponse(EventImage image) {
        return EventImageResponse.builder()
            .id(image.getId())
            .imageId(image.getImage() == null ? null : image.getImage().getId())
            .isCover(image.isPrimary())
            .sortOrder(image.getSortOrder())
            .build();
    }

    private CategoryResponse toCategoryResponse(Category category) {
        return CategoryResponse.builder()
            .id(category.getId())
            .name(category.getName())
            .description(category.getDescription())
            .build();
    }

    private Event loadEvent(Long id) {
        return eventRepository.findByIdAndDeletedAtIsNull(id)
            .orElseThrow(() -> new ResourceNotFoundException("Event not found"));
    }

    private User resolveActor(String actorIdentifier) {
        return userRepository.findByLoginOrEmailWithRoles(actorIdentifier)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private Organization resolveManagedOrganization(User actor) {
        return organizationMemberRepository.findAllByUserIdAndLeftAtIsNull(actor.getId()).stream()
            .map(OrganizationMember::getOrganization)
            .findFirst()
            .orElseThrow(() -> new BadRequestException("Пользователь не состоит ни в одной организации"));
    }

    private void assertCanManageEvent(User actor, Event event) {
        boolean owner = event.getCreatedByUser() != null && Objects.equals(event.getCreatedByUser().getId(), actor.getId());
        boolean organizationMember = organizationMemberRepository
            .existsByUserIdAndOrganizationIdAndLeftAtIsNull(actor.getId(), event.getOrganization().getId());
        if (!owner && !organizationMember) {
            throw new BadRequestException("Недостаточно прав для управления мероприятием");
        }
    }

    private City resolveCityForEvent(EventCreateRequest request, Organization organization) {
        if (request.getVenueCityId() != null) {
            return cityRepository.findById(request.getVenueCityId())
                .orElseThrow(() -> new ResourceNotFoundException("City not found"));
        }
        return organization.getCity();
    }

    private City resolveCityForEvent(EventUpdateRequest request, Organization organization) {
        if (request.getVenueCityId() == null) {
            return organization.getCity();
        }
        return cityRepository.findById(request.getVenueCityId())
            .orElseThrow(() -> new ResourceNotFoundException("City not found"));
    }

    private Venue resolveVenueForEvent(EventCreateRequest request) {
        if (request.getVenueId() != null) {
            return venueRepository.findById(request.getVenueId())
                .orElseThrow(() -> new ResourceNotFoundException("Venue not found"));
        }

        if (!StringUtils.hasText(request.getVenueAddress())) {
            return null;
        }

        City city = request.getVenueCityId() == null
            ? cityRepository.findFirstByNameIgnoreCase("Коломна")
                .orElseGet(() -> cityRepository.findAllByOrderByNameAsc().stream().findFirst().orElseThrow())
            : cityRepository.findById(request.getVenueCityId())
                .orElseThrow(() -> new ResourceNotFoundException("City not found"));

        return venueRepository.findFirstByAddressIgnoreCaseAndCityId(request.getVenueAddress().trim(), city.getId())
            .orElseGet(() -> venueRepository.save(Venue.builder()
                .city(city)
                .name(StringUtils.hasText(request.getVenueName()) ? request.getVenueName().trim() : "Площадка")
                .address(request.getVenueAddress().trim())
                .description(null)
                .latitude(request.getVenueLatitude())
                .longitude(request.getVenueLongitude())
                .capacity(request.getVenueCapacity())
                .active(true)
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build()));
    }

    private void ensureSessionForVenue(Event event, Venue venue, OffsetDateTime now) {
        Session session = Session.builder()
            .event(event)
            .venue(venue)
            .sessionTitle(event.getTitle())
            .startsAt(now.plusDays(7))
            .endsAt(now.plusDays(7).plusHours(2))
            .seatLimit(venue.getCapacity())
            .status("запланирован")
            .createdAt(now)
            .updatedAt(now)
            .build();
        Session savedSession = sessionRepository.save(session);
        ensureDefaultTicketType(savedSession, now);
    }

    private void upsertSessionVenue(Event event, Venue venue) {
        List<Session> sessions = sessionRepository.findAllByEventIdOrderByStartsAtAsc(event.getId());
        if (sessions.isEmpty()) {
            ensureSessionForVenue(event, venue, OffsetDateTime.now());
            return;
        }

        Session first = sessions.get(0);
        first.setVenue(venue);
        first.setUpdatedAt(OffsetDateTime.now());
        if (first.getSeatLimit() == null) {
            first.setSeatLimit(venue.getCapacity());
        }
        Session saved = sessionRepository.save(first);
        ensureDefaultTicketType(saved, OffsetDateTime.now());
    }

    private void updateEventCategories(Event event, Set<Long> categoryIds) {
        eventCategoryRepository.deleteByEventId(event.getId());
        if (categoryIds == null || categoryIds.isEmpty()) {
            return;
        }

        List<Category> categories = categoryRepository.findAllById(categoryIds);
        if (categories.isEmpty()) {
            return;
        }

        for (Category category : categories) {
            eventCategoryRepository.save(EventCategory.builder()
                .event(event)
                .category(category)
                .build());
        }
    }

    private void updateEventArtists(Event event, Set<Long> artistIds, List<String> newArtistNames) {
        eventArtistRepository.deleteByEventId(event.getId());
        List<Artist> artists = new ArrayList<>();
        if (artistIds != null && !artistIds.isEmpty()) {
            artists.addAll(artistRepository.findAllById(artistIds));
        }
        if (newArtistNames != null) {
            for (String rawName : newArtistNames) {
                if (!StringUtils.hasText(rawName)) {
                    continue;
                }
                String name = rawName.trim();
                Artist artist = artistRepository.save(Artist.builder()
                    .name(name)
                    .createdAt(OffsetDateTime.now())
                    .updatedAt(OffsetDateTime.now())
                    .build());
                artists.add(artist);
            }
        }

        for (Artist artist : artists) {
            eventArtistRepository.save(EventArtist.builder()
                .event(event)
                .artist(artist)
                .build());
        }
    }

    private void ensureDefaultTicketType(Session session, OffsetDateTime now) {
        if (!ticketTypeRepository.findAllBySessionIdOrderByIdAsc(session.getId()).isEmpty()) {
            return;
        }
        ticketTypeRepository.save(TicketType.builder()
            .session(session)
            .name("Стандарт")
            .price(BigDecimal.ZERO)
            .currency("RUB")
            .quota(session.getSeatLimit() == null ? 10000 : session.getSeatLimit())
            .active(true)
            .salesStartAt(now.minusDays(1))
            .salesEndAt(session.getStartsAt())
            .build());
    }

    private void updateEventImages(Event event, List<EventImageRequest> imageRequests) {
        eventImageRepository.deleteByEventId(event.getId());
        if (imageRequests == null || imageRequests.isEmpty()) {
            return;
        }

        boolean primarySelected = false;
        int fallbackOrder = 0;
        for (EventImageRequest imageRequest : imageRequests) {
            Image image = resolveImage(imageRequest.getImageId());
            if (image == null) {
                continue;
            }

            boolean markPrimary = Boolean.TRUE.equals(imageRequest.getIsCover());
            if (markPrimary && primarySelected) {
                markPrimary = false;
            }
            if (markPrimary) {
                primarySelected = true;
            }

            eventImageRepository.save(EventImage.builder()
                .event(event)
                .image(image)
                .primary(markPrimary)
                .sortOrder(imageRequest.getSortOrder() == null ? fallbackOrder : imageRequest.getSortOrder())
                .build());
            fallbackOrder++;
        }
    }

    private List<ArtistSummaryResponse> mapArtists(Long eventId) {
        return eventArtistRepository.findAllByEventIdOrderByIdAsc(eventId).stream()
            .map(EventArtist::getArtist)
            .filter(Objects::nonNull)
            .map(artist -> ArtistSummaryResponse.builder()
                .id(artist.getId())
                .name(artist.getName())
                .stageName(artist.getStageName())
                .description(artist.getDescription())
                .genre(artist.getGenre())
                .build())
            .toList();
    }

    private SessionShortResponse toSessionShortResponse(Session session) {
        long used = ticketRepository.countBySessionIdAndStatus(session.getId(), "активен");
        int capacity = session.getSeatLimit() == null ? 0 : session.getSeatLimit();
        int available = Math.max(0, capacity - (int) used);
        TicketType ticketType = defaultTicketType(session.getId());

        return SessionShortResponse.builder()
            .id(session.getId())
            .startAt(session.getStartsAt() == null ? null : session.getStartsAt().toLocalDateTime())
            .endAt(session.getEndsAt() == null ? null : session.getEndsAt().toLocalDateTime())
            .eventId(session.getEvent() == null ? null : session.getEvent().getId())
            .eventTitle(session.getEvent() == null ? null : session.getEvent().getTitle())
            .venueId(session.getVenue() == null ? null : session.getVenue().getId())
            .venueName(session.getVenue() == null ? session.getSessionTitle() : session.getVenue().getName())
            .venueAddress(session.getVenue() == null ? session.getManualAddress() : session.getVenue().getAddress())
            .cityName(resolveCityName(session))
            .latitude(session.getVenue() == null ? session.getLatitude() : session.getVenue().getLatitude())
            .longitude(session.getVenue() == null ? session.getLongitude() : session.getVenue().getLongitude())
            .availableSeats(available)
            .totalCapacity(capacity)
            .participationType(ticketType == null || ticketType.getPrice() == null || ticketType.getPrice().compareTo(BigDecimal.ZERO) <= 0 ? "free" : "paid")
            .price(ticketType == null ? BigDecimal.ZERO : ticketType.getPrice())
            .currency(ticketType == null ? "RUB" : ticketType.getCurrency())
            .registrationOpen(isRegistrationOpen(session))
            .build();
    }

    private String resolveCityName(Session session) {
        if (session.getVenue() != null && session.getVenue().getCity() != null) {
            return session.getVenue().getCity().getName();
        }
        if (session.getEvent() != null && session.getEvent().getCity() != null) {
            return session.getEvent().getCity().getName();
        }
        return null;
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
        if (session.getSeatLimit() != null) {
            long active = ticketRepository.countBySessionIdAndStatus(session.getId(), "активен");
            return active < session.getSeatLimit();
        }
        return true;
    }

    private PriceRange extractPriceRange(Set<Session> sessions) {
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

    private record PriceRange(BigDecimal min, BigDecimal max) {
    }

    private EventStatus parseEventStatus(String raw) {
        if (!StringUtils.hasText(raw)) {
            return null;
        }
        try {
            return EventStatus.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException ignored) {
            if ("опубликовано".equalsIgnoreCase(raw)) {
                return EventStatus.PUBLISHED;
            }
            if ("черновик".equalsIgnoreCase(raw)) {
                return EventStatus.DRAFT;
            }
            if ("на_рассмотрении".equalsIgnoreCase(raw)
                || "pending".equalsIgnoreCase(raw)
                || "pending_approval".equalsIgnoreCase(raw)
                || "on_moderation".equalsIgnoreCase(raw)) {
                return EventStatus.PENDING_APPROVAL;
            }
            if ("отклонено".equalsIgnoreCase(raw) || "отменено".equalsIgnoreCase(raw)) {
                return EventStatus.REJECTED;
            }
            if ("завершено".equalsIgnoreCase(raw) || "архив".equalsIgnoreCase(raw)) {
                return EventStatus.ARCHIVED;
            }
            return null;
        }
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

    private String formatAgeRestriction(Integer ageRating) {
        if (ageRating == null) {
            return null;
        }
        return ageRating + "+";
    }

    private Image resolveImage(Long imageId) {
        if (imageId != null) {
            return imageRepository.findById(imageId)
                .orElseThrow(() -> new ResourceNotFoundException("Image not found"));
        }
        return null;
    }

    private Long resolveOrganizationLogoImageId(Long organizationId) {
        if (organizationId == null) {
            return null;
        }
        return organizationImageRepository.findFirstByOrganizationIdAndLogoIsTrueOrderByIdAsc(organizationId)
            .map(orgImage -> orgImage.getImage() == null ? null : orgImage.getImage().getId())
            .orElse(null);
    }

    private String normalizeRequired(String value, String message) {
        if (!StringUtils.hasText(value)) {
            throw new BadRequestException(message);
        }
        return value.trim();
    }

    private String normalizeOptional(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }
}
