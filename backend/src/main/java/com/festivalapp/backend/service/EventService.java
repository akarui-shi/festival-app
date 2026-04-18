package com.festivalapp.backend.service;

import com.festivalapp.backend.dto.CategoryResponse;
import com.festivalapp.backend.dto.EventCreateRequest;
import com.festivalapp.backend.dto.EventDetailsResponse;
import com.festivalapp.backend.dto.EventImageRequest;
import com.festivalapp.backend.dto.EventImageResponse;
import com.festivalapp.backend.dto.EventShortResponse;
import com.festivalapp.backend.dto.EventUpdateRequest;
import com.festivalapp.backend.dto.OrganizationPublicResponse;
import com.festivalapp.backend.dto.OrganizerEventStatsResponse;
import com.festivalapp.backend.dto.VenueResponse;
import com.festivalapp.backend.entity.Category;
import com.festivalapp.backend.entity.City;
import com.festivalapp.backend.entity.Event;
import com.festivalapp.backend.entity.EventCategory;
import com.festivalapp.backend.entity.EventImage;
import com.festivalapp.backend.entity.EventStatus;
import com.festivalapp.backend.entity.Image;
import com.festivalapp.backend.entity.Organization;
import com.festivalapp.backend.entity.OrganizationMember;
import com.festivalapp.backend.entity.Session;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.entity.Venue;
import com.festivalapp.backend.exception.BadRequestException;
import com.festivalapp.backend.exception.ResourceNotFoundException;
import com.festivalapp.backend.repository.CategoryRepository;
import com.festivalapp.backend.repository.CityRepository;
import com.festivalapp.backend.repository.CommentRepository;
import com.festivalapp.backend.repository.EventCategoryRepository;
import com.festivalapp.backend.repository.EventImageRepository;
import com.festivalapp.backend.repository.EventRepository;
import com.festivalapp.backend.repository.FavoriteRepository;
import com.festivalapp.backend.repository.ImageRepository;
import com.festivalapp.backend.repository.OrganizationMemberRepository;
import com.festivalapp.backend.repository.OrganizationRepository;
import com.festivalapp.backend.repository.SessionRepository;
import com.festivalapp.backend.repository.TicketRepository;
import com.festivalapp.backend.repository.UserRepository;
import com.festivalapp.backend.repository.VenueRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

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
    private final CategoryRepository categoryRepository;
    private final SessionRepository sessionRepository;
    private final EventImageRepository eventImageRepository;
    private final ImageRepository imageRepository;
    private final CityRepository cityRepository;
    private final VenueRepository venueRepository;
    private final OrganizationRepository organizationRepository;
    private final OrganizationMemberRepository organizationMemberRepository;
    private final UserRepository userRepository;
    private final FavoriteRepository favoriteRepository;
    private final CommentRepository commentRepository;
    private final TicketRepository ticketRepository;

    @Transactional(readOnly = true)
    public List<EventShortResponse> getAll(String title,
                                           Long categoryId,
                                           Long venueId,
                                           Long cityId,
                                           Long organizationId,
                                           LocalDate date,
                                           LocalDate dateFrom,
                                           LocalDate dateTo,
                                           String status,
                                           String sortBy,
                                           String sortDir) {
        List<Event> events = eventRepository.findAllByDeletedAtIsNullOrderByCreatedAtDesc();

        return events.stream()
            .map(this::hydrateEvent)
            .filter(event -> matchesFilters(event, title, categoryId, venueId, cityId, organizationId, date, dateFrom, dateTo, status))
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
        return eventRepository.findAllByCreatedByUserIdAndDeletedAtIsNullOrderByCreatedAtDesc(actor.getId()).stream()
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
            .moderationStatus("на_рассмотрении")
            .createdAt(now)
            .updatedAt(now)
            .build();

        Event saved = eventRepository.save(event);
        updateEventCategories(saved, request.getCategoryIds());
        updateEventImages(saved, request.getEventImages());

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
            .filter(event -> status == null || DomainStatusMapper.toEventStatus(event.getStatus()) == status)
            .map(this::toShortResponse)
            .toList();
    }

    @Transactional
    public EventShortResponse updateStatusByAdmin(Long eventId, EventStatus status) {
        Event event = loadEvent(eventId);
        event.setStatus(DomainStatusMapper.toEventDbStatus(status));
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
        event.setEventCategories(new LinkedHashSet<>(categories));

        List<EventImage> images = eventImageRepository.findAllByEventIdOrderBySortOrderAscIdAsc(event.getId());
        event.setEventImages(images);

        event.setAgeRating(parseAgeRating(event.getAgeRestriction()));
        event.setCoverUrl(images.stream().filter(EventImage::isPrimary)
            .findFirst()
            .map(img -> img.getImage() == null ? null : img.getImage().getFileUrl())
            .orElse(images.stream().findFirst().map(img -> img.getImage() == null ? null : img.getImage().getFileUrl()).orElse(null)));

        event.setSessions(new LinkedHashSet<>(sessionRepository.findAllByEventIdOrderByStartsAtAsc(event.getId())));
        return event;
    }

    private boolean matchesFilters(Event event,
                                   String title,
                                   Long categoryId,
                                   Long venueId,
                                   Long cityId,
                                   Long organizationId,
                                   LocalDate date,
                                   LocalDate dateFrom,
                                   LocalDate dateTo,
                                   String status) {
        if (StringUtils.hasText(title) && (event.getTitle() == null
            || !event.getTitle().toLowerCase().contains(title.toLowerCase()))) {
            return false;
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
            .cityId(event.getCity() == null ? null : event.getCity().getId())
            .cityName(event.getCity() == null ? null : event.getCity().getName())
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
            .coverUrl(event.getCoverUrl())
            .build();
    }

    private EventDetailsResponse toDetailsResponse(Event event) {
        Session mainSession = event.getSessions().stream()
            .filter(session -> session.getVenue() != null)
            .min(Comparator.comparing(Session::getStartsAt, Comparator.nullsLast(Comparator.naturalOrder())))
            .orElse(event.getSessions().stream().findFirst().orElse(null));

        VenueResponse venueResponse = mainSession == null ? null : toVenueResponse(mainSession);

        return EventDetailsResponse.builder()
            .id(event.getId())
            .title(event.getTitle())
            .shortDescription(event.getShortDescription())
            .fullDescription(event.getFullDescription())
            .ageRating(event.getAgeRating())
            .createdAt(event.getCreatedAt() == null ? null : event.getCreatedAt().toLocalDateTime())
            .status(DomainStatusMapper.toEventStatus(event.getStatus()))
            .coverUrl(event.getCoverUrl())
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
            .imageUrl(image.getImage() == null ? null : image.getImage().getFileUrl())
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
        return organizationMemberRepository.findFirstByUserIdAndOrganizationStatusAndLeftAtIsNull(actor.getId(), "владелец")
            .map(OrganizationMember::getOrganization)
            .orElseThrow(() -> new BadRequestException("Пользователь не является владельцем организации"));
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
        sessionRepository.save(session);
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
        sessionRepository.save(first);
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

    private void updateEventImages(Event event, List<EventImageRequest> imageRequests) {
        eventImageRepository.deleteByEventId(event.getId());
        if (imageRequests == null || imageRequests.isEmpty()) {
            return;
        }

        int fallbackOrder = 0;
        for (EventImageRequest imageRequest : imageRequests) {
            if (!StringUtils.hasText(imageRequest.getImageUrl())) {
                continue;
            }

            Image image = imageRepository.save(Image.builder()
                .fileName(fileNameFromUrl(imageRequest.getImageUrl()))
                .mimeType("image/*")
                .fileSize(0L)
                .fileUrl(imageRequest.getImageUrl().trim())
                .uploadedAt(OffsetDateTime.now())
                .build());

            eventImageRepository.save(EventImage.builder()
                .event(event)
                .image(image)
                .primary(Boolean.TRUE.equals(imageRequest.getIsCover()))
                .sortOrder(imageRequest.getSortOrder() == null ? fallbackOrder : imageRequest.getSortOrder())
                .build());
            fallbackOrder++;
        }
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
            if ("черновик".equalsIgnoreCase(raw) || "на_рассмотрении".equalsIgnoreCase(raw)) {
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

    private String fileNameFromUrl(String url) {
        String trimmed = url.trim();
        int slash = trimmed.lastIndexOf('/');
        if (slash < 0 || slash == trimmed.length() - 1) {
            return "image-" + System.nanoTime();
        }
        return trimmed.substring(slash + 1);
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
