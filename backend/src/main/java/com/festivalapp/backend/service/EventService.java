package com.festivalapp.backend.service;

import com.festivalapp.backend.dto.CategoryResponse;
import com.festivalapp.backend.dto.EventCreateRequest;
import com.festivalapp.backend.dto.EventDetailsResponse;
import com.festivalapp.backend.dto.EventImageRequest;
import com.festivalapp.backend.dto.EventImageResponse;
import com.festivalapp.backend.dto.EventShortResponse;
import com.festivalapp.backend.dto.ParticipantSummaryResponse;
import com.festivalapp.backend.dto.SessionShortResponse;
import com.festivalapp.backend.dto.EventUpdateRequest;
import com.festivalapp.backend.dto.OrganizationPublicResponse;
import com.festivalapp.backend.dto.OrganizerEventStatsResponse;
import com.festivalapp.backend.dto.VenueResponse;
import com.festivalapp.backend.entity.Participant;
import com.festivalapp.backend.entity.Category;
import com.festivalapp.backend.entity.City;
import com.festivalapp.backend.entity.Event;
import com.festivalapp.backend.entity.EventParticipant;
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
import com.festivalapp.backend.repository.ParticipantRepository;
import com.festivalapp.backend.repository.ParticipantImageRepository;
import com.festivalapp.backend.exception.BadRequestException;
import com.festivalapp.backend.exception.ResourceNotFoundException;
import com.festivalapp.backend.repository.CategoryRepository;
import com.festivalapp.backend.repository.CityRepository;
import com.festivalapp.backend.repository.CommentRepository;
import com.festivalapp.backend.repository.EventParticipantRepository;
import com.festivalapp.backend.repository.EventCategoryRepository;
import com.festivalapp.backend.repository.EventImageRepository;
import com.festivalapp.backend.repository.EventRepository;
import com.festivalapp.backend.repository.FavoriteRepository;
import com.festivalapp.backend.repository.ImageRepository;
import com.festivalapp.backend.repository.OrganizationMemberRepository;
import com.festivalapp.backend.repository.OrganizationRepository;
import com.festivalapp.backend.repository.SessionRepository;
import com.festivalapp.backend.repository.OrganizationFollowRepository;
import com.festivalapp.backend.repository.TicketRepository;
import com.festivalapp.backend.repository.TicketTypeRepository;
import com.festivalapp.backend.repository.UserInterestRepository;
import com.festivalapp.backend.repository.UserRepository;
import com.festivalapp.backend.repository.VenueRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EventService {
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Europe/Moscow");
    private static final long PUBLIC_CACHE_TTL_MS = 5_000L;
    private static final int PUBLIC_CACHE_MAX_SIZE = 128;

    private final EventRepository eventRepository;
    private final EventCategoryRepository eventCategoryRepository;
    private final EventParticipantRepository eventParticipantRepository;
    private final ParticipantRepository participantRepository;
    private final ParticipantImageRepository participantImageRepository;
    private final CategoryRepository categoryRepository;
    private final SessionRepository sessionRepository;
    private final EventImageRepository eventImageRepository;
    private final ImageRepository imageRepository;
    private final CityRepository cityRepository;
    private final VenueRepository venueRepository;
    private final OrganizationRepository organizationRepository;
    private final OrganizationMemberRepository organizationMemberRepository;
    private final UserRepository userRepository;
    private final UserInterestRepository userInterestRepository;
    private final FavoriteRepository favoriteRepository;
    private final CommentRepository commentRepository;
    private final TicketRepository ticketRepository;
    private final TicketTypeRepository ticketTypeRepository;
    private final OrganizationFollowRepository organizationFollowRepository;
    private final EventNotificationService eventNotificationService;

    private final ConcurrentMap<EventListCacheKey, TimedCache<List<EventShortResponse>>> eventListCache = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, TimedCache<Map<String, Long>>> platformStatsCache = new ConcurrentHashMap<>();

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
        EventListCacheKey cacheKey = new EventListCacheKey(title, q, categoryId, venueId, cityId, organizationId,
            date, dateFrom, dateTo, participationType, priceFrom, priceTo, registrationOpen, status, sortBy, sortDir);
        List<EventShortResponse> cached = readCache(eventListCache.get(cacheKey));
        if (cached != null) {
            return cached;
        }

        String searchQuery = StringUtils.hasText(q) ? q.trim() : (StringUtils.hasText(title) ? title.trim() : null);
        EventStatus requestedStatus = StringUtils.hasText(status) ? parseEventStatus(status) : EventStatus.PUBLISHED;
        String statusFilter = DomainStatusMapper.toEventDbStatus(requestedStatus == null ? EventStatus.PUBLISHED : requestedStatus);
        String participationFilter = normalizeParticipationType(participationType);
        OffsetDateTime dateStart = date == null ? null : date.atStartOfDay(BUSINESS_ZONE).toOffsetDateTime();
        OffsetDateTime dateEnd = date == null ? null : date.plusDays(1).atStartOfDay(BUSINESS_ZONE).toOffsetDateTime();
        OffsetDateTime rangeStart = dateFrom == null ? null : dateFrom.atStartOfDay(BUSINESS_ZONE).toOffsetDateTime();
        OffsetDateTime rangeEnd = dateTo == null ? null : dateTo.plusDays(1).atStartOfDay(BUSINESS_ZONE).toOffsetDateTime();
        OffsetDateTime now = OffsetDateTime.now(BUSINESS_ZONE);

        List<Event> events = eventRepository.searchCatalog(
            normalizeOptional(searchQuery),
            categoryId,
            venueId,
            cityId,
            organizationId,
            dateStart,
            dateEnd,
            rangeStart,
            rangeEnd,
            participationFilter,
            priceFrom,
            priceTo,
            registrationOpen,
            statusFilter,
            now
        );
        EventCatalogData catalogData = hydrateEvents(events);

        List<EventShortResponse> response = events.stream()
            .sorted(resolveSort(sortBy, sortDir, catalogData))
            .map(event -> toShortResponse(event, catalogData))
            .toList();
        writeCache(eventListCache, cacheKey, response);
        return response;
    }

    @Transactional(readOnly = true)
    public List<EventShortResponse> getRecommendations(String actorIdentifier, Long cityId, Integer limit) {
        int safeLimit = limit == null || limit <= 0 ? 8 : Math.min(limit, 50);

        Set<Long> preferredCategoryIds = new HashSet<>();
        if (StringUtils.hasText(actorIdentifier)) {
            userRepository.findByLoginOrEmailWithRoles(actorIdentifier).ifPresent(user -> {
                userInterestRepository.findAllByUserId(user.getId())
                    .forEach(ui -> preferredCategoryIds.add(ui.getCategoryId()));
                favoriteRepository.findAllByUserIdOrderByCreatedAtDesc(user.getId()).forEach(fav -> {
                    Event favEvent = hydrateEvent(fav.getEvent());
                    favEvent.getEventCategories().stream()
                        .map(ec -> ec.getCategory().getId())
                        .forEach(preferredCategoryIds::add);
                });
            });
        }

        List<Event> published = eventRepository.findAllByDeletedAtIsNullOrderByCreatedAtDesc().stream()
            .map(this::hydrateEvent)
            .filter(e -> cityId == null || (e.getCity() != null && Objects.equals(e.getCity().getId(), cityId)))
            .filter(e -> DomainStatusMapper.toEventStatus(e.getStatus()) == EventStatus.PUBLISHED)
            .toList();

        // Batch-запрос: один SELECT вместо N запросов в компараторе
        List<Long> eventIds = published.stream().map(Event::getId).filter(Objects::nonNull).toList();
        Map<Long, Long> favoriteCounts = favoriteRepository.countsByEventIds(eventIds);

        Comparator<Event> sorter;
        if (preferredCategoryIds.isEmpty()) {
            sorter = Comparator.comparingLong((Event e) -> favoriteCounts.getOrDefault(e.getId(), 0L)).reversed()
                .thenComparing(Event::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder()));
        } else {
            sorter = Comparator.<Event, Integer>comparing(e -> {
                Set<Long> ids = e.getEventCategories().stream()
                    .map(ec -> ec.getCategory().getId())
                    .collect(Collectors.toSet());
                return (int) preferredCategoryIds.stream().filter(ids::contains).count();
            }).reversed()
            .thenComparing(Comparator.comparingLong((Event e) -> favoriteCounts.getOrDefault(e.getId(), 0L)).reversed());
        }

        return published.stream()
            .sorted(sorter)
            .limit(safeLimit)
            .map(this::toShortResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<EventShortResponse> getSimilarEvents(Long eventId, Integer limit) {
        int safeLimit = limit == null || limit <= 0 ? 4 : Math.min(limit, 12);

        Event current = hydrateEvent(loadEvent(eventId));
        Set<Long> categoryIds = current.getEventCategories().stream()
            .map(ec -> ec.getCategory().getId())
            .collect(Collectors.toSet());
        Long cityId = current.getCity() != null ? current.getCity().getId() : null;

        return eventRepository.findAllByDeletedAtIsNullOrderByCreatedAtDesc().stream()
            .filter(e -> !e.getId().equals(eventId))
            .map(this::hydrateEvent)
            .filter(e -> DomainStatusMapper.toEventStatus(e.getStatus()) == EventStatus.PUBLISHED)
            .filter(e -> {
                if (categoryIds.isEmpty()) return true;
                Set<Long> eCatIds = e.getEventCategories().stream()
                    .map(ec -> ec.getCategory().getId())
                    .collect(Collectors.toSet());
                return !Collections.disjoint(categoryIds, eCatIds);
            })
            .sorted(Comparator.<Event, Integer>comparing(e -> {
                Long eCityId = e.getCity() != null ? e.getCity().getId() : null;
                return Objects.equals(eCityId, cityId) ? 0 : 1;
            }).thenComparing(Comparator.comparingLong((Event e) -> favoriteRepository.countByEventId(e.getId())).reversed()))
            .limit(safeLimit)
            .map(this::toShortResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public Map<String, Long> getPlatformStats() {
        Map<String, Long> cached = readCache(platformStatsCache.get("platform-stats"));
        if (cached != null) {
            return cached;
        }

        List<Event> published = eventRepository.findAllByDeletedAtIsNullOrderByCreatedAtDesc().stream()
            .filter(e -> DomainStatusMapper.toEventStatus(e.getStatus()) == EventStatus.PUBLISHED)
            .toList();

        long totalEvents = published.size();
        long totalRegistrations = ticketRepository.countByStatusForPublishedEvents(
            "активен",
            DomainStatusMapper.toEventDbStatus(EventStatus.PUBLISHED)
        );

        long totalCities = cityRepository.findAllByOrderByNameAsc().stream()
            .filter(City::isActive)
            .count();

        Map<String, Long> stats = new HashMap<>();
        stats.put("totalEvents", totalEvents);
        stats.put("totalRegistrations", totalRegistrations);
        stats.put("totalCities", totalCities);
        writeCache(platformStatsCache, "platform-stats", stats);
        return stats;
    }

    @Transactional(readOnly = true)
    public OrganizationPublicResponse getOrganizationProfile(Long organizationId, String actorIdentifier) {
        Organization organization = organizationRepository.findByIdAndDeletedAtIsNull(organizationId)
            .orElseThrow(() -> new ResourceNotFoundException("Organization not found"));

        long followersCount = organizationFollowRepository.countByOrganizationId(organizationId);
        boolean following = false;
        if (org.springframework.util.StringUtils.hasText(actorIdentifier)) {
            var userOpt = userRepository.findByLoginOrEmailWithRoles(actorIdentifier);
            if (userOpt.isPresent()) {
                following = organizationFollowRepository.existsByUserIdAndOrganizationId(
                    userOpt.get().getId(), organizationId);
            }
        }

        return OrganizationPublicResponse.builder()
            .id(organization.getId())
            .name(organization.getName())
            .description(organization.getDescription())
            .contacts(organization.getContacts())
            .contactEmail(organization.getContactEmail())
            .contactPhone(organization.getContactPhone())
            .website(organization.getWebsite())
            .socialLinks(organization.getSocialLinks())
            .logoImageId(organization.getLogoImage() == null ? null : organization.getLogoImage().getId())
            .coverImageId(organization.getCoverImage() == null ? null : organization.getCoverImage().getId())
            .followersCount(followersCount)
            .following(following)
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
                .startAt(toBusinessLocal(session.getStartsAt()))
                .endAt(toBusinessLocal(session.getEndsAt()))
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
        updateEventParticipants(saved, request.getParticipantIds(), request.getNewParticipantNames());

        if (venue != null) {
            ensureSessionForVenue(saved, venue, now);
        }

        clearPublicCache();
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
        if (request.getParticipantIds() != null || request.getNewParticipantNames() != null) {
            updateEventParticipants(saved, request.getParticipantIds(), request.getNewParticipantNames());
        }

        if (request.getVenueId() != null) {
            Venue venue = venueRepository.findById(request.getVenueId())
                .orElseThrow(() -> new ResourceNotFoundException("Venue not found"));
            upsertSessionVenue(saved, venue);
        }

        clearPublicCache();
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
        clearPublicCache();
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
        EventStatus previousStatus = DomainStatusMapper.toEventStatus(event.getStatus());
        EventStatus targetStatus = status == null ? EventStatus.DRAFT : status;
        event.setStatus(DomainStatusMapper.toEventDbStatus(targetStatus));
        event.setUpdatedAt(OffsetDateTime.now());
        Event saved = eventRepository.save(event);
        if (previousStatus != EventStatus.PUBLISHED && targetStatus == EventStatus.PUBLISHED) {
            eventNotificationService.notifyNewPublishedEvent(saved.getId());
        }
        clearPublicCache();
        return toShortResponse(hydrateEvent(saved));
    }

    @Transactional
    public Map<String, Object> delete(Long id, String actorIdentifier) {
        User actor = resolveActor(actorIdentifier);
        Event event = loadEvent(id);
        assertCanManageEvent(actor, event);
        event.setDeletedAt(OffsetDateTime.now());
        event.setUpdatedAt(OffsetDateTime.now());
        eventRepository.save(event);
        clearPublicCache();
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

    private EventCatalogData hydrateEvents(List<Event> events) {
        if (events.isEmpty()) {
            return EventCatalogData.empty();
        }

        List<Long> eventIds = events.stream().map(Event::getId).filter(Objects::nonNull).toList();
        Map<Long, List<EventCategory>> categoriesByEvent = eventCategoryRepository.findAllByEventIdIn(eventIds).stream()
            .collect(Collectors.groupingBy(eventCategory -> eventCategory.getEvent().getId()));
        Map<Long, List<EventImage>> imagesByEvent = eventImageRepository.findAllByEventIdInOrderByEventIdAscSortOrderAscIdAsc(eventIds).stream()
            .collect(Collectors.groupingBy(eventImage -> eventImage.getEvent().getId()));
        Map<Long, List<Session>> sessionsByEvent = sessionRepository.findAllByEventIdInOrderByEventIdAscStartsAtAsc(eventIds).stream()
            .collect(Collectors.groupingBy(session -> session.getEvent().getId()));
        Map<Long, List<EventParticipant>> participantsByEvent = eventParticipantRepository.findAllByEventIdInOrderByEventIdAscIdAsc(eventIds).stream()
            .collect(Collectors.groupingBy(eventParticipant -> eventParticipant.getEvent().getId()));

        List<Long> sessionIds = sessionsByEvent.values().stream()
            .flatMap(List::stream)
            .map(Session::getId)
            .filter(Objects::nonNull)
            .toList();
        Map<Long, TicketType> activeTicketTypeBySession = sessionIds.isEmpty()
            ? Map.of()
            : ticketTypeRepository.findAllBySessionIdInAndActiveIsTrueOrderBySessionIdAscIdAsc(sessionIds).stream()
                .collect(Collectors.toMap(
                    ticketType -> ticketType.getSession().getId(),
                    Function.identity(),
                    (first, ignored) -> first
                ));
        Map<Long, Long> activeTicketsBySession = sessionIds.isEmpty()
            ? Map.of()
            : ticketRepository.countBySessionIdsAndStatus(sessionIds, "активен").stream()
                .collect(Collectors.toMap(
                    TicketRepository.SessionTicketCount::getSessionId,
                    TicketRepository.SessionTicketCount::getCount
                ));

        List<Long> participantIds = participantsByEvent.values().stream()
            .flatMap(List::stream)
            .map(EventParticipant::getParticipant)
            .filter(Objects::nonNull)
            .map(Participant::getId)
            .filter(Objects::nonNull)
            .distinct()
            .toList();
        Map<Long, List<Long>> imageIdsByParticipant = participantIds.isEmpty()
            ? Map.of()
            : participantImageRepository.findAllByParticipantIdInOrderByParticipantIdAscPrimaryDescIdAsc(participantIds).stream()
                .collect(Collectors.groupingBy(
                    participantImage -> participantImage.getParticipant().getId(),
                    Collectors.mapping(
                        participantImage -> participantImage.getImage() == null ? null : participantImage.getImage().getId(),
                        Collectors.filtering(Objects::nonNull, Collectors.toList())
                    )
                ));

        events.forEach(event -> {
            List<EventCategory> categories = categoriesByEvent.getOrDefault(event.getId(), List.of());
            event.getEventCategories().clear();
            event.getEventCategories().addAll(categories);

            List<EventImage> images = imagesByEvent.getOrDefault(event.getId(), List.of());
            event.getEventImages().clear();
            event.getEventImages().addAll(images);

            event.setAgeRating(parseAgeRating(event.getAgeRestriction()));
            event.setCoverImageId(images.stream().filter(EventImage::isPrimary)
                .findFirst()
                .map(img -> img.getImage() == null ? null : img.getImage().getId())
                .orElse(images.stream().findFirst().map(img -> img.getImage() == null ? null : img.getImage().getId()).orElse(null)));

            event.getSessions().clear();
            event.getSessions().addAll(sessionsByEvent.getOrDefault(event.getId(), List.of()));
        });

        return new EventCatalogData(
            participantsByEvent,
            activeTicketTypeBySession,
            activeTicketsBySession,
            imageIdsByParticipant
        );
    }

    private String normalizeParticipationType(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        String normalized = value.trim().toLowerCase();
        if ("free".equals(normalized) || "бесплатно".equals(normalized)) {
            return "free";
        }
        if ("paid".equals(normalized) || "платно".equals(normalized)) {
            return "paid";
        }
        return null;
    }

    private Comparator<Event> resolveSort(String sortBy, String sortDir) {
        return resolveSort(sortBy, sortDir, null);
    }

    private Comparator<Event> resolveSort(String sortBy, String sortDir, EventCatalogData catalogData) {
        Comparator<Event> comparator;
        if ("title".equalsIgnoreCase(sortBy)) {
            comparator = Comparator.comparing(Event::getTitle, Comparator.nullsLast(String::compareToIgnoreCase));
        } else if ("nextSessionAt".equalsIgnoreCase(sortBy)) {
            comparator = Comparator.comparing(this::nextSessionAt, Comparator.nullsLast(Comparator.naturalOrder()));
        } else if ("price".equalsIgnoreCase(sortBy)) {
            // Сортируем по минимальной цене среди билетов всех сессий события.
            // Бесплатные/без билетов — считаем как 0, чтобы они шли первыми при asc.
            comparator = Comparator.comparing(event -> minTicketPrice(event, catalogData), Comparator.nullsLast(Comparator.naturalOrder()));
        } else {
            comparator = Comparator.comparing(Event::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder()));
        }

        return "asc".equalsIgnoreCase(sortDir) ? comparator : comparator.reversed();
    }

    private BigDecimal minTicketPrice(Event event) {
        return minTicketPrice(event, null);
    }

    private BigDecimal minTicketPrice(Event event, EventCatalogData catalogData) {
        return event.getSessions().stream()
            .map(session -> defaultTicketType(session.getId(), catalogData))
            .filter(Objects::nonNull)
            .map(TicketType::getPrice)
            .filter(Objects::nonNull)
            .min(Comparator.naturalOrder())
            .orElse(BigDecimal.ZERO);
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
        return toShortResponse(event, null);
    }

    private EventShortResponse toShortResponse(Event event, EventCatalogData catalogData) {
        Session mainSession = event.getSessions().stream()
            .filter(session -> session.getVenue() != null)
            .min(Comparator.comparing(Session::getStartsAt, Comparator.nullsLast(Comparator.naturalOrder())))
            .orElse(event.getSessions().stream().findFirst().orElse(null));
        PriceRange priceRange = extractPriceRange(event.getSessions(), catalogData);
        boolean registrationOpen = event.getSessions().stream().anyMatch(session -> isRegistrationOpen(session, catalogData));
        List<ParticipantSummaryResponse> participants = mapParticipants(event.getId(), catalogData);
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
            .mapToLong(sessionId -> activeTicketsCount(sessionId, catalogData))
            .sum();

        return EventShortResponse.builder()
            .id(event.getId())
            .title(event.getTitle())
            .shortDescription(event.getShortDescription())
            .ageRating(event.getAgeRating())
            .createdAt(toBusinessLocal(event.getCreatedAt()))
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
            .nextSessionAt(toBusinessLocal(nextSessionAt(event)))
            .sessionDates(event.getSessions().stream()
                .map(Session::getStartsAt)
                .filter(Objects::nonNull)
                .map(this::toBusinessLocal)
                .sorted()
                .toList())
            .coverImageId(event.getCoverImageId())
            .free(priceRange.min() == null || priceRange.min().compareTo(BigDecimal.ZERO) <= 0)
            .minPrice(priceRange.min())
            .maxPrice(priceRange.max())
            .registrationOpen(registrationOpen)
            .sessionsCount(sessionsCount)
            .registrationsCount(registrationsCount)
            .participants(participants)
            .latitude(resolveLatitude(mainSession))
            .longitude(resolveLongitude(mainSession))
            .build();
    }

    private BigDecimal resolveLatitude(Session session) {
        if (session == null) return null;
        if (session.getLatitude() != null) return session.getLatitude();
        if (session.getVenue() != null) return session.getVenue().getLatitude();
        return null;
    }

    private BigDecimal resolveLongitude(Session session) {
        if (session == null) return null;
        if (session.getLongitude() != null) return session.getLongitude();
        if (session.getVenue() != null) return session.getVenue().getLongitude();
        return null;
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
            .createdAt(toBusinessLocal(event.getCreatedAt()))
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
            .participants(mapParticipants(event.getId()))
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

    private void updateEventParticipants(Event event, Set<Long> participantIds, List<String> newParticipantNames) {
        eventParticipantRepository.deleteByEventId(event.getId());
        List<Participant> participants = new ArrayList<>();
        if (participantIds != null && !participantIds.isEmpty()) {
            participants.addAll(participantRepository.findAllById(participantIds));
        }
        if (newParticipantNames != null) {
            for (String rawName : newParticipantNames) {
                if (!StringUtils.hasText(rawName)) {
                    continue;
                }
                String name = rawName.trim();
                Participant participant = participantRepository.save(Participant.builder()
                    .name(name)
                    .kind("исполнитель")
                    .createdAt(OffsetDateTime.now())
                    .updatedAt(OffsetDateTime.now())
                    .build());
                participants.add(participant);
            }
        }

        for (Participant participant : participants) {
            eventParticipantRepository.save(EventParticipant.builder()
                .event(event)
                .participant(participant)
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

    private List<ParticipantSummaryResponse> mapParticipants(Long eventId) {
        return mapParticipants(eventId, null);
    }

    private List<ParticipantSummaryResponse> mapParticipants(Long eventId, EventCatalogData catalogData) {
        List<EventParticipant> eventParticipants = catalogData == null
            ? eventParticipantRepository.findAllByEventIdOrderByIdAsc(eventId)
            : catalogData.participantsByEvent().getOrDefault(eventId, List.of());

        return eventParticipants.stream()
            .map(EventParticipant::getParticipant)
            .filter(Objects::nonNull)
            .map(participant -> {
                List<Long> imageIds = catalogData == null
                    ? participantImageRepository.findAllByParticipantIdOrderByPrimaryDescIdAsc(participant.getId()).stream()
                        .map(participantImage -> participantImage.getImage() == null ? null : participantImage.getImage().getId())
                        .filter(Objects::nonNull)
                        .toList()
                    : catalogData.imageIdsByParticipant().getOrDefault(participant.getId(), List.of());
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
            })
            .toList();
    }

    private SessionShortResponse toSessionShortResponse(Session session) {
        long used = ticketRepository.countBySessionIdAndStatus(session.getId(), "активен");
        int capacity = session.getSeatLimit() == null ? 0 : session.getSeatLimit();
        int available = Math.max(0, capacity - (int) used);
        TicketType ticketType = defaultTicketType(session.getId());

        return SessionShortResponse.builder()
            .id(session.getId())
            .startAt(toBusinessLocal(session.getStartsAt()))
            .endAt(toBusinessLocal(session.getEndsAt()))
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
        return defaultTicketType(sessionId, null);
    }

    private TicketType defaultTicketType(Long sessionId, EventCatalogData catalogData) {
        if (catalogData != null) {
            return catalogData.activeTicketTypeBySession().get(sessionId);
        }
        return ticketTypeRepository.findFirstBySessionIdAndActiveIsTrueOrderByIdAsc(sessionId).orElse(null);
    }

    private boolean isRegistrationOpen(Session session) {
        return isRegistrationOpen(session, null);
    }

    private boolean isRegistrationOpen(Session session, EventCatalogData catalogData) {
        TicketType type = defaultTicketType(session.getId(), catalogData);
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
            long active = activeTicketsCount(session.getId(), catalogData);
            return active < session.getSeatLimit();
        }
        return true;
    }

    private java.time.LocalDateTime toBusinessLocal(OffsetDateTime value) {
        if (value == null) {
            return null;
        }
        return value.atZoneSameInstant(BUSINESS_ZONE).toLocalDateTime();
    }

    private PriceRange extractPriceRange(Set<Session> sessions) {
        return extractPriceRange(sessions, null);
    }

    private PriceRange extractPriceRange(Set<Session> sessions, EventCatalogData catalogData) {
        BigDecimal min = null;
        BigDecimal max = null;

        for (Session session : sessions) {
            TicketType ticketType = defaultTicketType(session.getId(), catalogData);
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

    private long activeTicketsCount(Long sessionId, EventCatalogData catalogData) {
        if (catalogData != null) {
            return catalogData.activeTicketsBySession().getOrDefault(sessionId, 0L);
        }
        return ticketRepository.countBySessionIdAndStatus(sessionId, "активен");
    }

    private <K, V> V readCache(ConcurrentMap<K, TimedCache<V>> cache, K key) {
        return readCache(cache.get(key));
    }

    private <V> V readCache(TimedCache<V> entry) {
        if (entry == null || entry.expiresAtMs() < System.currentTimeMillis()) {
            return null;
        }
        return entry.value();
    }

    private <K, V> void writeCache(ConcurrentMap<K, TimedCache<V>> cache, K key, V value) {
        if (cache.size() >= PUBLIC_CACHE_MAX_SIZE) {
            cache.clear();
        }
        cache.put(key, new TimedCache<>(value, System.currentTimeMillis() + PUBLIC_CACHE_TTL_MS));
    }

    private void clearPublicCache() {
        eventListCache.clear();
        platformStatsCache.clear();
    }

    private record PriceRange(BigDecimal min, BigDecimal max) {
    }

    private record EventCatalogData(
        Map<Long, List<EventParticipant>> participantsByEvent,
        Map<Long, TicketType> activeTicketTypeBySession,
        Map<Long, Long> activeTicketsBySession,
        Map<Long, List<Long>> imageIdsByParticipant
    ) {
        private static EventCatalogData empty() {
            return new EventCatalogData(Map.of(), Map.of(), Map.of(), Map.of());
        }
    }

    private record EventListCacheKey(
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
        String status,
        String sortBy,
        String sortDir
    ) {
    }

    private record TimedCache<T>(T value, long expiresAtMs) {
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
            if ("отклонено".equalsIgnoreCase(raw)) {
                return EventStatus.REJECTED;
            }
            if ("отменено".equalsIgnoreCase(raw) || "cancelled".equalsIgnoreCase(raw)) {
                return EventStatus.CANCELLED;
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
