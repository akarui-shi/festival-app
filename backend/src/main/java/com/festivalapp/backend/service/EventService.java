package com.festivalapp.backend.service;

import com.festivalapp.backend.dto.EventCreateRequest;
import com.festivalapp.backend.dto.CategoryResponse;
import com.festivalapp.backend.dto.EventDetailsResponse;
import com.festivalapp.backend.dto.EventImageRequest;
import com.festivalapp.backend.dto.EventImageResponse;
import com.festivalapp.backend.dto.OrganizationPublicResponse;
import com.festivalapp.backend.dto.OrganizerEventStatsResponse;
import com.festivalapp.backend.dto.EventShortResponse;
import com.festivalapp.backend.dto.EventUpdateRequest;
import com.festivalapp.backend.dto.VenueResponse;
import com.festivalapp.backend.entity.Category;
import com.festivalapp.backend.entity.City;
import com.festivalapp.backend.entity.Event;
import com.festivalapp.backend.entity.EventImage;
import com.festivalapp.backend.entity.EventStatus;
import com.festivalapp.backend.entity.Favorite;
import com.festivalapp.backend.entity.Organization;
import com.festivalapp.backend.entity.Organizer;
import com.festivalapp.backend.entity.Registration;
import com.festivalapp.backend.entity.RegistrationStatus;
import com.festivalapp.backend.entity.RoleName;
import com.festivalapp.backend.entity.Session;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.entity.Venue;
import com.festivalapp.backend.exception.BadRequestException;
import com.festivalapp.backend.exception.ResourceNotFoundException;
import com.festivalapp.backend.repository.CategoryRepository;
import com.festivalapp.backend.repository.CityRepository;
import com.festivalapp.backend.repository.EventCategoryRepository;
import com.festivalapp.backend.repository.EventImageRepository;
import com.festivalapp.backend.repository.EventRepository;
import com.festivalapp.backend.repository.FavoriteRepository;
import com.festivalapp.backend.repository.OrganizationRepository;
import com.festivalapp.backend.repository.OrganizerRepository;
import com.festivalapp.backend.repository.PublicationRepository;
import com.festivalapp.backend.repository.RegistrationRepository;
import com.festivalapp.backend.repository.ReviewRepository;
import com.festivalapp.backend.repository.SessionRepository;
import com.festivalapp.backend.repository.UserRepository;
import com.festivalapp.backend.repository.VenueRepository;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EventService {

    private static final int DEFAULT_RECOMMENDATIONS_LIMIT = 6;
    private static final int MAX_RECOMMENDATIONS_LIMIT = 24;
    private static final Set<RegistrationStatus> ACTIVE_REGISTRATION_STATUSES = EnumSet.of(RegistrationStatus.CREATED);

    private final EventRepository eventRepository;
    private final EventCategoryRepository eventCategoryRepository;
    private final EventImageRepository eventImageRepository;
    private final OrganizerRepository organizerRepository;
    private final OrganizationRepository organizationRepository;
    private final CategoryRepository categoryRepository;
    private final CityRepository cityRepository;
    private final UserRepository userRepository;
    private final RegistrationRepository registrationRepository;
    private final SessionRepository sessionRepository;
    private final ReviewRepository reviewRepository;
    private final FavoriteRepository favoriteRepository;
    private final PublicationRepository publicationRepository;
    private final VenueRepository venueRepository;

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
        LocalDate effectiveDateFrom = date != null ? date : dateFrom;
        LocalDate effectiveDateTo = date != null ? date : dateTo;
        validateDateRange(effectiveDateFrom, effectiveDateTo);
        EventStatus requestedStatus = parseStatus(status);
        // Public feed must expose only published events regardless of caller.
        if (requestedStatus != null && requestedStatus != EventStatus.PUBLISHED) {
            return List.of();
        }

        Specification<Event> specification = buildSpecification(
            title,
            categoryId,
            venueId,
            cityId,
            organizationId,
            effectiveDateFrom,
            effectiveDateTo,
            EventStatus.PUBLISHED
        );
        Sort sort = buildSort(sortBy, sortDir);

        return eventRepository.findAll(specification, sort).stream()
            .map(this::toShortResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<EventShortResponse> getRecommendations(String actorIdentifier, Long cityId, Integer limit) {
        int resolvedLimit = resolveRecommendationsLimit(limit);
        List<Event> publishedEvents = loadPublishedEvents(cityId);
        if (publishedEvents.isEmpty()) {
            return List.of();
        }

        Map<Long, Long> popularityByEventId = resolvePopularityByEventId(publishedEvents);
        if (!StringUtils.hasText(actorIdentifier)) {
            return takePopularEvents(publishedEvents, popularityByEventId, Set.of(), resolvedLimit).stream()
                .map(this::toShortResponse)
                .toList();
        }

        User actor = userRepository.findByLoginOrEmailWithRoles(actorIdentifier).orElse(null);
        if (actor == null) {
            return takePopularEvents(publishedEvents, popularityByEventId, Set.of(), resolvedLimit).stream()
                .map(this::toShortResponse)
                .toList();
        }

        List<Favorite> favorites = favoriteRepository.findByUserIdWithEventCategoriesOrderByIdDesc(actor.getId());
        List<Registration> registrations = registrationRepository.findAllByUserIdWithEventCategories(actor.getId());

        Set<Long> consumedEventIds = new HashSet<>();
        Set<Long> favoriteCategoryIds = extractFavoriteCategoryIds(favorites, consumedEventIds);
        Set<Long> registrationCategoryIds = extractRegistrationCategoryIds(registrations, consumedEventIds);
        boolean hasPersonalSignals = !favoriteCategoryIds.isEmpty() || !registrationCategoryIds.isEmpty();

        if (!hasPersonalSignals) {
            return takePopularEvents(publishedEvents, popularityByEventId, consumedEventIds, resolvedLimit).stream()
                .map(this::toShortResponse)
                .toList();
        }

        List<RecommendationScore> rankedEvents = publishedEvents.stream()
            .filter(event -> event.getId() != null && !consumedEventIds.contains(event.getId()))
            .map(event -> scoreEvent(event, cityId, favoriteCategoryIds, registrationCategoryIds, popularityByEventId))
            .filter(score -> score.score() > 0)
            .sorted(Comparator
                .comparingInt(RecommendationScore::score).reversed()
                .thenComparing(RecommendationScore::popularity, Comparator.reverseOrder())
                .thenComparing(score -> {
                    LocalDateTime date = score.event().getCreatedAt();
                    return date != null ? date : LocalDateTime.MIN;
                }, Comparator.reverseOrder()))
            .toList();

        LinkedHashSet<Event> collected = new LinkedHashSet<>();
        for (RecommendationScore score : rankedEvents) {
            if (collected.size() >= resolvedLimit) {
                break;
            }
            collected.add(score.event());
        }

        if (collected.size() < resolvedLimit) {
            Set<Long> excludeIds = new HashSet<>(consumedEventIds);
            excludeIds.addAll(collected.stream().map(Event::getId).filter(Objects::nonNull).toList());
            List<Event> popularFallback = takePopularEvents(
                publishedEvents,
                popularityByEventId,
                excludeIds,
                resolvedLimit - collected.size()
            );
            collected.addAll(popularFallback);
        }

        return collected.stream()
            .limit(resolvedLimit)
            .map(this::toShortResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public OrganizationPublicResponse getOrganizationProfile(Long organizationId) {
        Organization organization = organizationRepository.findById(organizationId)
            .orElseThrow(() -> new ResourceNotFoundException("Organization not found: " + organizationId));

        return OrganizationPublicResponse.builder()
            .id(organization.getId())
            .name(organization.getName())
            .description(organization.getDescription())
            .contacts(organization.getContacts())
            .build();
    }

    @Transactional(readOnly = true)
    public List<EventShortResponse> getPublicByOrganization(Long organizationId) {
        if (!organizationRepository.existsById(organizationId)) {
            throw new ResourceNotFoundException("Organization not found: " + organizationId);
        }

        return eventRepository.findAllByOrganizationIdAndStatus(
                organizationId,
                EventStatus.PUBLISHED,
                Sort.by(Sort.Direction.DESC, "createdAt")
            ).stream()
            .map(this::toShortResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public EventDetailsResponse getById(Long id) {
        Event event = eventRepository.findDetailedById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + id));
        if (event.getStatus() != EventStatus.PUBLISHED) {
            throw new ResourceNotFoundException("Event not found: " + id);
        }
        return toDetailsResponse(event);
    }

    @Transactional(readOnly = true)
    public EventDetailsResponse getOrganizerEventById(Long id, String actorIdentifier) {
        User actor = loadActor(actorIdentifier);
        Event event = eventRepository.findDetailedById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + id));

        validateOrganizerViewAccess(actor, event);
        return toDetailsResponse(event);
    }

    @Transactional(readOnly = true)
    public OrganizerEventStatsResponse getOrganizerEventStats(Long id, String actorIdentifier) {
        User actor = loadActor(actorIdentifier);
        Event event = eventRepository.findDetailedById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + id));
        validateOrganizerViewAccess(actor, event);

        List<Session> sortedSessions = event.getSessions().stream()
            .sorted(Comparator.comparing(Session::getStartTime, Comparator.nullsLast(Comparator.naturalOrder())))
            .toList();
        List<Long> sessionIds = sortedSessions.stream()
            .map(Session::getId)
            .filter(Objects::nonNull)
            .toList();

        Map<Long, Integer> occupiedSeatsBySessionId = resolveOccupiedSeatsBySessionId(sessionIds);
        int occupiedSeats = occupiedSeatsBySessionId.values().stream()
            .mapToInt(Integer::intValue)
            .sum();

        int totalCapacity = sortedSessions.stream()
            .mapToInt(this::resolveSessionCapacity)
            .sum();

        long registrationsCount = registrationRepository.countBySessionEventIdAndStatus(id, RegistrationStatus.CREATED);
        long cancellationsCount = registrationRepository.countBySessionEventIdAndStatus(id, RegistrationStatus.CANCELLED);
        int occupancyPercent = calculateOccupancyPercent(occupiedSeats, totalCapacity);

        List<OrganizerEventStatsResponse.SessionStats> sessionStats = sortedSessions.stream()
            .map(session -> {
                int sessionCapacity = resolveSessionCapacity(session);
                int sessionOccupiedSeats = occupiedSeatsBySessionId.getOrDefault(session.getId(), 0);
                return OrganizerEventStatsResponse.SessionStats.builder()
                    .sessionId(session.getId())
                    .startAt(session.getStartTime())
                    .endAt(session.getEndTime())
                    .capacity(sessionCapacity > 0 ? sessionCapacity : null)
                    .occupiedSeats(sessionOccupiedSeats)
                    .occupancyPercent(calculateOccupancyPercent(sessionOccupiedSeats, sessionCapacity))
                    .build();
            })
            .toList();

        return OrganizerEventStatsResponse.builder()
            .eventId(event.getId())
            .registrationsCount(registrationsCount)
            .cancellationsCount(cancellationsCount)
            .occupiedSeats(occupiedSeats)
            .totalCapacity(totalCapacity)
            .occupancyPercent(occupancyPercent)
            .sessions(sessionStats)
            .build();
    }

    @Transactional(readOnly = true)
    public List<EventShortResponse> getOrganizerEvents(String actorIdentifier) {
        User actor = loadActor(actorIdentifier);
        Sort sort = Sort.by(Sort.Direction.DESC, "createdAt");

        List<Event> events;
        if (hasRole(actor, RoleName.ROLE_ADMIN)) {
            events = eventRepository.findAll((Specification<Event>) null, sort);
        } else {
            if (!hasRole(actor, RoleName.ROLE_ORGANIZER)) {
                throw new AccessDeniedException("Only organizers or admins can access organizer events");
            }

            Organization organization = resolveActorOrganization(actor);
            if (organization == null) {
                throw new BadRequestException("Организатор не привязан к организации. Обратитесь к администратору.");
            }
            events = eventRepository.findAllByOrganizationId(organization.getId(), sort);
        }

        return events.stream()
            .map(this::toShortResponse)
            .toList();
    }

    @Transactional
    public EventShortResponse create(EventCreateRequest request, String actorIdentifier) {
        User actor = loadActor(actorIdentifier);
        Organization organization = resolveOrganizationForCreate(actor);
        Venue venue = resolveVenueForRequest(
            request.getVenueId(),
            request.getVenueAddress(),
            request.getVenueLatitude(),
            request.getVenueLongitude(),
            request.getVenueCityId(),
            request.getVenueCityName(),
            request.getVenueRegion(),
            request.getVenueCountry(),
            request.getVenueName(),
            request.getVenueContacts(),
            request.getVenueCapacity()
        );

        Set<Category> categories = resolveCategories(request.getCategoryIds());

        Event event = Event.builder()
            .title(request.getTitle())
            .shortDescription(request.getShortDescription())
            .fullDescription(request.getFullDescription())
            .ageRating(request.getAgeRating())
            .createdAt(LocalDateTime.now())
            .status(EventStatus.PENDING_APPROVAL)
            .organization(organization)
            .venue(venue)
            .categories(categories)
            .build();

        syncEventImages(event, request.getEventImages(), request.getCoverUrl());
        return toShortResponse(eventRepository.save(event));
    }

    @Transactional
    public EventShortResponse update(Long id, EventUpdateRequest request, String actorIdentifier) {
        User actor = loadActor(actorIdentifier);
        Event event = eventRepository.findDetailedById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + id));
        validateUpdateOrDeleteAccess(actor, event);
        boolean isAdmin = hasRole(actor, RoleName.ROLE_ADMIN);
        boolean contentUpdated = false;

        if (hasVenueUpdate(request)) {
            event.setVenue(resolveVenueForRequest(
                request.getVenueId(),
                request.getVenueAddress(),
                request.getVenueLatitude(),
                request.getVenueLongitude(),
                request.getVenueCityId(),
                request.getVenueCityName(),
                request.getVenueRegion(),
                request.getVenueCountry(),
                request.getVenueName(),
                request.getVenueContacts(),
                request.getVenueCapacity()
            ));
            contentUpdated = true;
        }

        if (request.getTitle() != null) {
            event.setTitle(request.getTitle());
            contentUpdated = true;
        }
        if (request.getShortDescription() != null) {
            event.setShortDescription(request.getShortDescription());
            contentUpdated = true;
        }
        if (request.getFullDescription() != null) {
            event.setFullDescription(request.getFullDescription());
            contentUpdated = true;
        }
        if (request.getAgeRating() != null) {
            event.setAgeRating(request.getAgeRating());
            contentUpdated = true;
        }
        if (request.getEventImages() != null || request.getCoverUrl() != null) {
            syncEventImages(event, request.getEventImages(), request.getCoverUrl());
            contentUpdated = true;
        }
        if (request.getCategoryIds() != null) {
            event.setCategories(resolveCategories(request.getCategoryIds()));
            contentUpdated = true;
        }

        // Organization edits are always re-submitted for moderation.
        if (!isAdmin && contentUpdated && event.getStatus() != EventStatus.ARCHIVED) {
            event.setStatus(EventStatus.PENDING_APPROVAL);
        }

        return toShortResponse(eventRepository.save(event));
    }

    @Transactional
    public Map<String, Object> archive(Long id, String actorIdentifier) {
        User actor = loadActor(actorIdentifier);
        Event event = eventRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + id));
        validateUpdateOrDeleteAccess(actor, event);

        event.setStatus(EventStatus.ARCHIVED);
        eventRepository.save(event);

        return Map.of(
            "message", "Event archived successfully",
            "eventId", id,
            "status", event.getStatus()
        );
    }

    @Transactional(readOnly = true)
    public List<EventShortResponse> getAllForAdmin(EventStatus status) {
        Sort sort = Sort.by(Sort.Direction.DESC, "createdAt");
        List<Event> events = status == null
            ? eventRepository.findAll((Specification<Event>) null, sort)
            : eventRepository.findAll(
                (root, query, cb) -> cb.equal(root.get("status"), status),
                sort
            );

        return events.stream()
            .map(this::toShortResponse)
            .toList();
    }

    @Transactional
    public EventShortResponse updateStatusByAdmin(Long eventId, EventStatus status) {
        if (status == null) {
            throw new BadRequestException("Status is required");
        }

        Event event = eventRepository.findDetailedById(eventId)
            .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + eventId));

        EventStatus currentStatus = event.getStatus();
        if (currentStatus == null) {
            throw new BadRequestException("У мероприятия не установлен текущий статус");
        }
        if (currentStatus == status) {
            throw new BadRequestException("Статус мероприятия уже установлен: " + status.name());
        }

        Set<EventStatus> allowedTargets = getAllowedAdminTransitions(currentStatus);
        if (!allowedTargets.contains(status)) {
            String allowedStatuses = allowedTargets.stream()
                .map(Enum::name)
                .sorted()
                .collect(Collectors.joining(", "));
            throw new BadRequestException(
                "Недопустимый переход статуса мероприятия: " + currentStatus.name() + " -> " + status.name()
                    + ". Допустимые статусы: " + allowedStatuses
            );
        }

        event.setStatus(status);
        return toShortResponse(eventRepository.save(event));
    }

    private Set<EventStatus> getAllowedAdminTransitions(EventStatus currentStatus) {
        return switch (currentStatus) {
            case PENDING_APPROVAL -> EnumSet.of(EventStatus.PUBLISHED, EventStatus.REJECTED, EventStatus.ARCHIVED);
            case PUBLISHED -> EnumSet.of(EventStatus.REJECTED, EventStatus.ARCHIVED);
            case REJECTED -> EnumSet.of(EventStatus.PUBLISHED, EventStatus.ARCHIVED);
            case ARCHIVED -> EnumSet.of(EventStatus.PUBLISHED);
        };
    }

    @Transactional
    public Map<String, Object> delete(Long id, String actorIdentifier) {
        User actor = loadActor(actorIdentifier);
        Event event = eventRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + id));
        validateUpdateOrDeleteAccess(actor, event);

        // Remove dependent records explicitly to avoid FK conflicts on event deletion.
        registrationRepository.deleteByEventId(id);
        reviewRepository.deleteByEventId(id);
        favoriteRepository.deleteByEventId(id);
        publicationRepository.deleteByEventId(id);
        sessionRepository.deleteByEventId(id);
        eventCategoryRepository.deleteByEventId(id);
        eventImageRepository.deleteByEventId(id);

        eventRepository.delete(event);

        return Map.of(
            "message", "Event deleted successfully",
            "eventId", id
        );
    }

    private User loadActor(String actorIdentifier) {
        return userRepository.findByLoginOrEmailWithRoles(actorIdentifier)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private Organization resolveOrganizationForCreate(User actor) {
        if (hasRole(actor, RoleName.ROLE_ADMIN)) {
            throw new AccessDeniedException("Администратор не может создавать мероприятия");
        }

        if (!hasRole(actor, RoleName.ROLE_ORGANIZER)) {
            throw new AccessDeniedException("Только организатор может создавать мероприятия");
        }

        Organization actorOrganization = resolveActorOrganization(actor);
        if (actorOrganization == null) {
            throw new BadRequestException("Организатор не привязан к организации. Обратитесь к администратору.");
        }

        return actorOrganization;
    }

    private boolean hasVenueUpdate(EventUpdateRequest request) {
        return request.getVenueId() != null
            || request.getVenueAddress() != null
            || request.getVenueLatitude() != null
            || request.getVenueLongitude() != null
            || request.getVenueCityId() != null
            || request.getVenueCityName() != null
            || request.getVenueRegion() != null
            || request.getVenueCountry() != null
            || request.getVenueName() != null
            || request.getVenueContacts() != null
            || request.getVenueCapacity() != null;
    }

    private Venue resolveVenueForRequest(Long venueId,
                                         String venueAddress,
                                         BigDecimal venueLatitude,
                                         BigDecimal venueLongitude,
                                         Long venueCityId,
                                         String venueCityName,
                                         String venueRegion,
                                         String venueCountry,
                                         String venueName,
                                         String venueContacts,
                                         Integer venueCapacity) {
        if (venueId != null) {
            return resolveVenueById(venueId);
        }

        String normalizedAddress = normalizeOptional(venueAddress);
        if (normalizedAddress == null) {
            throw new BadRequestException("Адрес площадки обязателен");
        }
        if (venueLatitude == null || venueLongitude == null) {
            throw new BadRequestException("Не удалось определить координаты площадки. Выберите адрес из подсказок или точку на карте.");
        }

        City city = resolveCityForVenue(venueCityId, venueCityName, venueRegion, venueCountry, normalizedAddress);
        Venue existingVenue = venueRepository.findFirstByAddressIgnoreCaseAndCityId(normalizedAddress, city.getId()).orElse(null);
        if (existingVenue != null) {
            existingVenue.setLatitude(venueLatitude);
            existingVenue.setLongitude(venueLongitude);
            if (StringUtils.hasText(venueName)) {
                existingVenue.setName(venueName.trim());
            }
            if (venueContacts != null) {
                existingVenue.setContacts(normalizeOptional(venueContacts));
            }
            if (venueCapacity != null) {
                existingVenue.setCapacity(venueCapacity);
            }
            return venueRepository.save(existingVenue);
        }

        String resolvedVenueName = StringUtils.hasText(venueName)
            ? venueName.trim()
            : buildVenueNameFromAddress(normalizedAddress);

        return venueRepository.save(Venue.builder()
            .name(resolvedVenueName)
            .address(normalizedAddress)
            .contacts(normalizeOptional(venueContacts))
            .latitude(venueLatitude)
            .longitude(venueLongitude)
            .capacity(venueCapacity)
            .city(city)
            .build());
    }

    private Venue resolveVenueById(Long venueId) {
        return venueRepository.findById(venueId)
            .orElseThrow(() -> new ResourceNotFoundException("Venue not found: " + venueId));
    }

    private City resolveCityForVenue(Long cityId,
                                     String cityName,
                                     String region,
                                     String country,
                                     String address) {
        if (cityId != null) {
            return cityRepository.findById(cityId)
                .orElseThrow(() -> new ResourceNotFoundException("City not found: " + cityId));
        }

        String normalizedCityName = normalizeOptional(cityName);
        String normalizedRegion = normalizeOptional(region);
        String normalizedCountry = normalizeOptional(country);

        if (normalizedCityName != null && normalizedRegion != null && normalizedCountry != null) {
            City exact = cityRepository
                .findFirstByNameIgnoreCaseAndRegionIgnoreCaseAndCountryIgnoreCase(
                    normalizedCityName,
                    normalizedRegion,
                    normalizedCountry
                )
                .orElse(null);
            if (exact != null) {
                return exact;
            }
        }

        if (normalizedCityName != null) {
            City byName = cityRepository.findFirstByNameIgnoreCase(normalizedCityName).orElse(null);
            if (byName != null) {
                return byName;
            }
        }

        City inferredFromAddress = inferCityFromAddress(address);
        if (inferredFromAddress != null) {
            return inferredFromAddress;
        }

        throw new BadRequestException("Не удалось определить город по адресу. Выберите адрес точнее.");
    }

    private City inferCityFromAddress(String address) {
        if (!StringUtils.hasText(address)) {
            return null;
        }
        String normalizedAddress = address.toLowerCase(Locale.ROOT);
        return cityRepository.findAllByOrderByNameAsc().stream()
            .filter(city -> StringUtils.hasText(city.getName()))
            .filter(city -> normalizedAddress.contains(city.getName().toLowerCase(Locale.ROOT)))
            .max(Comparator.comparingInt(city -> city.getName().length()))
            .orElse(null);
    }

    private String buildVenueNameFromAddress(String address) {
        if (!StringUtils.hasText(address)) {
            return "Площадка мероприятия";
        }
        String trimmed = address.trim();
        if (trimmed.length() <= 120) {
            return trimmed;
        }
        return trimmed.substring(0, 120);
    }

    private Organization resolveActorOrganization(User actor) {
        Organizer organizer = actor.getOrganizer();
        if (organizer != null && organizer.getOrganization() != null) {
            return organizer.getOrganization();
        }
        Organizer persistedOrganizer = organizerRepository.findByUserId(actor.getId()).orElse(null);
        if (persistedOrganizer != null && persistedOrganizer.getOrganization() != null) {
            return persistedOrganizer.getOrganization();
        }
        return null;
    }

    private void validateUpdateOrDeleteAccess(User actor, Event event) {
        if (hasRole(actor, RoleName.ROLE_ADMIN)) {
            return;
        }

        // Organizers can only manage events linked to their own organization.
        if (!hasRole(actor, RoleName.ROLE_ORGANIZER)) {
            throw new AccessDeniedException("Only organizers or admins can manage events");
        }

        Organization actorOrganization = resolveActorOrganization(actor);
        if (actorOrganization == null || event.getOrganization() == null
            || !actorOrganization.getId().equals(event.getOrganization().getId())) {
            throw new AccessDeniedException("Organization can manage only own events");
        }
    }

    private void validateOrganizerViewAccess(User actor, Event event) {
        if (hasRole(actor, RoleName.ROLE_ADMIN)) {
            return;
        }

        if (!hasRole(actor, RoleName.ROLE_ORGANIZER)) {
            throw new AccessDeniedException("Only organizers or admins can access organizer events");
        }

        Organization actorOrganization = resolveActorOrganization(actor);
        if (actorOrganization == null || event.getOrganization() == null
            || !actorOrganization.getId().equals(event.getOrganization().getId())) {
            throw new AccessDeniedException("Organization can access only own events");
        }
    }

    private boolean hasRole(User user, RoleName roleName) {
        return user.getUserRoles().stream()
            .anyMatch(userRole -> userRole.getRole().getName() == roleName);
    }

    private Set<Category> resolveCategories(Set<Long> categoryIds) {
        if (categoryIds == null || categoryIds.isEmpty()) {
            return new HashSet<>();
        }

        Set<Long> normalizedCategoryIds = categoryIds.stream()
            .filter(Objects::nonNull)
            .collect(Collectors.toSet());

        if (normalizedCategoryIds.isEmpty()) {
            return new HashSet<>();
        }

        List<Category> categories = categoryRepository.findAllById(normalizedCategoryIds);
        Set<Long> foundIds = categories.stream()
            .map(Category::getId)
            .collect(Collectors.toSet());

        Set<Long> missingIds = new HashSet<>(normalizedCategoryIds);
        missingIds.removeAll(foundIds);
        if (!missingIds.isEmpty()) {
            throw new ResourceNotFoundException("Category not found: " + missingIds.iterator().next());
        }

        return new HashSet<>(categories);
    }

    private Specification<Event> buildSpecification(String title,
                                                    Long categoryId,
                                                    Long venueId,
                                                    Long cityId,
                                                    Long organizationId,
                                                    LocalDate dateFrom,
                                                    LocalDate dateTo,
                                                    EventStatus status) {
        // Dynamic filtering for the public events feed.
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (query != null) {
                query.distinct(true);
            }

            if (StringUtils.hasText(title)) {
                predicates.add(cb.like(
                    cb.lower(root.get("title")),
                    "%" + title.trim().toLowerCase(Locale.ROOT) + "%"
                ));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (categoryId != null) {
                predicates.add(cb.equal(root.join("categories", JoinType.LEFT).get("id"), categoryId));
            }
            if (venueId != null) {
                predicates.add(cb.equal(root.join("venue", JoinType.LEFT).get("id"), venueId));
            }
            if (cityId != null) {
                predicates.add(cb.equal(root.join("venue", JoinType.LEFT).join("city", JoinType.LEFT).get("id"), cityId));
            }
            if (organizationId != null) {
                predicates.add(cb.equal(root.join("organization", JoinType.LEFT).get("id"), organizationId));
            }
            if (dateFrom != null || dateTo != null) {
                var sessionJoin = root.join("sessions", JoinType.INNER);
                if (dateFrom != null) {
                    predicates.add(cb.greaterThanOrEqualTo(sessionJoin.get("startTime"), dateFrom.atStartOfDay()));
                }
                if (dateTo != null) {
                    predicates.add(cb.lessThan(sessionJoin.get("startTime"), dateTo.plusDays(1).atStartOfDay()));
                }
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private void validateDateRange(LocalDate dateFrom, LocalDate dateTo) {
        if (dateFrom != null && dateTo != null && dateFrom.isAfter(dateTo)) {
            throw new BadRequestException("Некорректный диапазон дат: дата начала больше даты окончания");
        }
    }

    private Sort buildSort(String sortBy, String sortDir) {
        String sortField;
        if (!StringUtils.hasText(sortBy)) {
            sortField = "createdAt";
        } else if ("createdAt".equalsIgnoreCase(sortBy)) {
            sortField = "createdAt";
        } else if ("title".equalsIgnoreCase(sortBy)) {
            sortField = "title";
        } else {
            throw new BadRequestException("Unsupported sortBy value: " + sortBy);
        }

        Sort.Direction direction = Sort.Direction.DESC;
        if (StringUtils.hasText(sortDir)) {
            try {
                direction = Sort.Direction.fromString(sortDir);
            } catch (IllegalArgumentException ex) {
                throw new BadRequestException("Unsupported sortDir value: " + sortDir);
            }
        }

        return Sort.by(direction, sortField);
    }

    private EventStatus parseStatus(String status) {
        if (!StringUtils.hasText(status)) {
            return null;
        }

        try {
            return EventStatus.valueOf(status.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Unsupported status: " + status);
        }
    }

    private int resolveRecommendationsLimit(Integer limit) {
        if (limit == null) {
            return DEFAULT_RECOMMENDATIONS_LIMIT;
        }
        if (limit <= 0) {
            throw new BadRequestException("Параметр limit должен быть больше 0");
        }
        return Math.min(limit, MAX_RECOMMENDATIONS_LIMIT);
    }

    private List<Event> loadPublishedEvents(Long cityId) {
        Sort sort = Sort.by(Sort.Direction.DESC, "createdAt");
        if (cityId != null) {
            return eventRepository.findAllByStatusAndVenueCityId(EventStatus.PUBLISHED, cityId, sort);
        }
        return eventRepository.findAllByStatus(EventStatus.PUBLISHED, sort);
    }

    private Map<Long, Long> resolvePopularityByEventId(List<Event> events) {
        if (events == null || events.isEmpty()) {
            return Map.of();
        }

        Set<Long> eventIds = events.stream()
            .map(Event::getId)
            .filter(Objects::nonNull)
            .collect(Collectors.toSet());
        if (eventIds.isEmpty()) {
            return Map.of();
        }

        Map<Long, Long> popularityByEventId = new HashMap<>();
        List<Object[]> rows = registrationRepository.sumParticipantsByEventIdsAndStatuses(eventIds, ACTIVE_REGISTRATION_STATUSES);
        for (Object[] row : rows) {
            if (row == null || row.length < 2 || row[0] == null || row[1] == null) {
                continue;
            }

            Number eventIdValue = (Number) row[0];
            Number registrationsValue = (Number) row[1];
            popularityByEventId.put(eventIdValue.longValue(), registrationsValue.longValue());
        }

        return popularityByEventId;
    }

    private List<Event> takePopularEvents(List<Event> events,
                                          Map<Long, Long> popularityByEventId,
                                          Set<Long> excludedEventIds,
                                          int limit) {
        if (limit <= 0 || events == null || events.isEmpty()) {
            return List.of();
        }

        return events.stream()
            .filter(event -> event.getId() != null)
            .filter(event -> excludedEventIds == null || !excludedEventIds.contains(event.getId()))
            .sorted(Comparator
                .comparing((Event event) -> popularityByEventId.getOrDefault(event.getId(), 0L), Comparator.reverseOrder())
                .thenComparing(event -> event.getCreatedAt() != null ? event.getCreatedAt() : LocalDateTime.MIN, Comparator.reverseOrder()))
            .limit(limit)
            .toList();
    }

    private Set<Long> extractFavoriteCategoryIds(List<Favorite> favorites, Set<Long> consumedEventIds) {
        if (favorites == null || favorites.isEmpty()) {
            return Set.of();
        }

        Set<Long> categoryIds = new HashSet<>();
        for (Favorite favorite : favorites) {
            if (favorite == null || favorite.getEvent() == null) {
                continue;
            }
            Event event = favorite.getEvent();
            if (event.getId() != null) {
                consumedEventIds.add(event.getId());
            }
            categoryIds.addAll(extractCategoryIds(event));
        }
        return categoryIds;
    }

    private Set<Long> extractRegistrationCategoryIds(List<Registration> registrations, Set<Long> consumedEventIds) {
        if (registrations == null || registrations.isEmpty()) {
            return Set.of();
        }

        Set<Long> categoryIds = new HashSet<>();
        for (Registration registration : registrations) {
            if (registration == null || registration.getSession() == null || registration.getSession().getEvent() == null) {
                continue;
            }
            Event event = registration.getSession().getEvent();
            if (event.getId() != null) {
                consumedEventIds.add(event.getId());
            }
            categoryIds.addAll(extractCategoryIds(event));
        }
        return categoryIds;
    }

    private Set<Long> extractCategoryIds(Event event) {
        if (event == null || event.getCategories() == null || event.getCategories().isEmpty()) {
            return Set.of();
        }

        return event.getCategories().stream()
            .map(Category::getId)
            .filter(Objects::nonNull)
            .collect(Collectors.toSet());
    }

    private RecommendationScore scoreEvent(Event event,
                                           Long cityId,
                                           Set<Long> favoriteCategoryIds,
                                           Set<Long> registrationCategoryIds,
                                           Map<Long, Long> popularityByEventId) {
        Set<Long> eventCategoryIds = extractCategoryIds(event);
        int favoriteOverlap = (int) eventCategoryIds.stream().filter(favoriteCategoryIds::contains).count();
        int registrationOverlap = (int) eventCategoryIds.stream().filter(registrationCategoryIds::contains).count();

        int score = 0;
        if (cityId != null && Objects.equals(resolveEventCityId(event), cityId)) {
            score += 30;
        }
        score += Math.min(favoriteOverlap * 24, 72);
        score += Math.min(registrationOverlap * 16, 48);
        if (favoriteOverlap > 0 && registrationOverlap > 0) {
            score += 8;
        }

        long popularity = popularityByEventId.getOrDefault(event.getId(), 0L);
        score += Math.min((int) popularity, 25);
        return new RecommendationScore(event, score, popularity);
    }

    private Long resolveEventCityId(Event event) {
        if (event == null || event.getVenue() == null || event.getVenue().getCity() == null) {
            return null;
        }
        return event.getVenue().getCity().getId();
    }

    private Map<Long, Integer> resolveOccupiedSeatsBySessionId(List<Long> sessionIds) {
        Map<Long, Integer> occupiedSeatsBySessionId = new HashMap<>();
        if (sessionIds == null || sessionIds.isEmpty()) {
            return occupiedSeatsBySessionId;
        }

        List<Object[]> rows = registrationRepository.sumParticipantsBySessionIdsAndStatuses(
            sessionIds,
            ACTIVE_REGISTRATION_STATUSES
        );
        for (Object[] row : rows) {
            if (row == null || row.length < 2 || row[0] == null || row[1] == null) {
                continue;
            }

            Number sessionId = (Number) row[0];
            Number occupiedSeats = (Number) row[1];
            occupiedSeatsBySessionId.put(sessionId.longValue(), occupiedSeats.intValue());
        }

        return occupiedSeatsBySessionId;
    }

    private int resolveSessionCapacity(Session session) {
        if (session != null && session.getCapacity() != null && session.getCapacity() > 0) {
            return session.getCapacity();
        }

        Venue venue = session != null && session.getEvent() != null ? session.getEvent().getVenue() : null;
        if (venue != null && venue.getCapacity() != null && venue.getCapacity() > 0) {
            return venue.getCapacity();
        }
        return 0;
    }

    private int calculateOccupancyPercent(int occupiedSeats, int totalCapacity) {
        if (totalCapacity <= 0 || occupiedSeats <= 0) {
            return 0;
        }
        return (int) Math.round((occupiedSeats * 100.0) / totalCapacity);
    }

    private EventShortResponse toShortResponse(Event event) {
        Venue venue = event.getVenue();
        List<LocalDateTime> sortedSessionDates = extractSortedSessionDates(event);
        return EventShortResponse.builder()
            .id(event.getId())
            .title(event.getTitle())
            .shortDescription(event.getShortDescription())
            .ageRating(event.getAgeRating())
            .createdAt(event.getCreatedAt())
            .status(event.getStatus())
            .organizationId(event.getOrganization() != null ? event.getOrganization().getId() : null)
            .organizationName(event.getOrganization() != null ? event.getOrganization().getName() : null)
            .venueId(venue != null ? venue.getId() : null)
            .venueName(venue != null ? venue.getName() : null)
            .venueAddress(venue != null ? venue.getAddress() : null)
            .cityId(venue != null && venue.getCity() != null ? venue.getCity().getId() : null)
            .cityName(venue != null && venue.getCity() != null ? venue.getCity().getName() : null)
            .categories(toCategoryResponses(event.getCategories()))
            .nextSessionAt(resolveNextSessionDate(sortedSessionDates))
            .sessionDates(sortedSessionDates)
            .coverUrl(event.getCoverUrl())
            .build();
    }

    private List<LocalDateTime> extractSortedSessionDates(Event event) {
        if (event == null || event.getSessions() == null || event.getSessions().isEmpty()) {
            return List.of();
        }

        return event.getSessions().stream()
            .map(Session::getStartTime)
            .filter(Objects::nonNull)
            .distinct()
            .sorted()
            .toList();
    }

    private LocalDateTime resolveNextSessionDate(List<LocalDateTime> sortedSessionDates) {
        if (sortedSessionDates == null || sortedSessionDates.isEmpty()) {
            return null;
        }

        LocalDateTime now = LocalDateTime.now();
        return sortedSessionDates.stream()
            .filter(date -> !date.isBefore(now))
            .findFirst()
            .orElse(sortedSessionDates.get(0));
    }

    private record RecommendationScore(Event event, int score, Long popularity) {
    }

    private EventDetailsResponse toDetailsResponse(Event event) {
        return EventDetailsResponse.builder()
            .id(event.getId())
            .title(event.getTitle())
            .shortDescription(event.getShortDescription())
            .fullDescription(event.getFullDescription())
            .ageRating(event.getAgeRating())
            .createdAt(event.getCreatedAt())
            .status(event.getStatus())
            .coverUrl(event.getCoverUrl())
            .eventImages(toEventImageResponses(event.getEventImages()))
            .organization(toOrganizationSummary(event.getOrganization()))
            .venue(toVenueResponse(event.getVenue()))
            .categories(toCategoryResponses(event.getCategories()))
            .build();
    }

    private EventDetailsResponse.OrganizationSummary toOrganizationSummary(Organization organization) {
        if (organization == null) {
            return null;
        }

        return EventDetailsResponse.OrganizationSummary.builder()
            .id(organization.getId())
            .name(organization.getName())
            .description(organization.getDescription())
            .contacts(organization.getContacts())
            .build();
    }

    private List<CategoryResponse> toCategoryResponses(Set<Category> categories) {
        return categories.stream()
            .sorted(Comparator.comparing(Category::getName, String.CASE_INSENSITIVE_ORDER))
            .map(category -> CategoryResponse.builder()
                .id(category.getId())
                .name(category.getName())
                .description(category.getDescription())
                .build())
            .toList();
    }

    private VenueResponse toVenueResponse(Venue venue) {
        if (venue == null) {
            return null;
        }
        return VenueResponse.builder()
            .id(venue.getId())
            .name(venue.getName())
            .address(venue.getAddress())
            .contacts(venue.getContacts())
            .latitude(venue.getLatitude())
            .longitude(venue.getLongitude())
            .capacity(venue.getCapacity())
            .cityId(venue.getCity() != null ? venue.getCity().getId() : null)
            .cityName(venue.getCity() != null ? venue.getCity().getName() : null)
            .build();
    }

    private void syncEventImages(Event event, List<EventImageRequest> imageRequests, String fallbackCoverUrl) {
        List<EventImage> normalizedImages = normalizeEventImages(event, imageRequests, fallbackCoverUrl);
        event.getEventImages().clear();
        event.getEventImages().addAll(normalizedImages);
        event.setCoverUrl(resolveCoverUrl(normalizedImages));
    }

    private List<EventImage> normalizeEventImages(Event event,
                                                  List<EventImageRequest> imageRequests,
                                                  String fallbackCoverUrl) {
        if (imageRequests != null) {
            List<EventImageRequest> validRequests = imageRequests.stream()
                .filter(Objects::nonNull)
                .filter(request -> StringUtils.hasText(request.getImageUrl()))
                .toList();

            if (validRequests.isEmpty()) {
                if (StringUtils.hasText(fallbackCoverUrl)) {
                    return List.of(EventImage.builder()
                        .event(event)
                        .imageUrl(fallbackCoverUrl.trim())
                        .isCover(true)
                        .sortOrder(0)
                        .build());
                }
                return List.of();
            }

            int coverIndex = findCoverIndex(validRequests);
            List<EventImage> images = new ArrayList<>();
            for (int index = 0; index < validRequests.size(); index++) {
                EventImageRequest request = validRequests.get(index);
                int sortOrder = request.getSortOrder() != null ? request.getSortOrder() : index;
                images.add(EventImage.builder()
                    .event(event)
                    .imageUrl(request.getImageUrl().trim())
                    .isCover(index == coverIndex)
                    .sortOrder(sortOrder)
                    .build());
            }
            return images;
        }

        if (fallbackCoverUrl != null) {
            String normalizedCoverUrl = normalizeOptional(fallbackCoverUrl);
            if (normalizedCoverUrl == null) {
                return List.of();
            }

            List<EventImage> existingImages = new ArrayList<>(event.getEventImages());
            if (existingImages.isEmpty()) {
                return List.of(EventImage.builder()
                    .event(event)
                    .imageUrl(normalizedCoverUrl)
                    .isCover(true)
                    .sortOrder(0)
                    .build());
            }

            for (int index = 0; index < existingImages.size(); index++) {
                EventImage image = existingImages.get(index);
                image.setEvent(event);
                image.setCover(false);
                image.setSortOrder(index + 1);
            }

            EventImage coverImage = existingImages.stream()
                .filter(image -> normalizedCoverUrl.equals(image.getImageUrl()))
                .findFirst()
                .orElse(null);
            if (coverImage == null) {
                coverImage = EventImage.builder()
                    .event(event)
                    .imageUrl(normalizedCoverUrl)
                    .isCover(true)
                    .sortOrder(0)
                    .build();
                existingImages.add(0, coverImage);
            } else {
                coverImage.setCover(true);
                coverImage.setSortOrder(0);
            }

            return existingImages.stream()
                .sorted(Comparator.comparing(EventImage::getSortOrder, Comparator.nullsLast(Integer::compareTo)))
                .toList();
        }

        if (!StringUtils.hasText(event.getCoverUrl())) {
            return new ArrayList<>(event.getEventImages());
        }

        if (event.getEventImages().isEmpty()) {
            return List.of(EventImage.builder()
                .event(event)
                .imageUrl(event.getCoverUrl().trim())
                .isCover(true)
                .sortOrder(0)
                .build());
        }

        return new ArrayList<>(event.getEventImages());
    }

    private int findCoverIndex(List<EventImageRequest> imageRequests) {
        for (int index = 0; index < imageRequests.size(); index++) {
            if (Boolean.TRUE.equals(imageRequests.get(index).getIsCover())) {
                return index;
            }
        }
        return 0;
    }

    private String resolveCoverUrl(List<EventImage> images) {
        if (images == null || images.isEmpty()) {
            return null;
        }
        return images.stream()
            .filter(EventImage::isCover)
            .map(EventImage::getImageUrl)
            .filter(StringUtils::hasText)
            .findFirst()
            .orElseGet(() -> images.stream()
                .map(EventImage::getImageUrl)
                .filter(StringUtils::hasText)
                .findFirst()
                .orElse(null));
    }

    private String normalizeOptional(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }

    private List<EventImageResponse> toEventImageResponses(List<EventImage> images) {
        if (images == null || images.isEmpty()) {
            return List.of();
        }
        return images.stream()
            .sorted(Comparator.comparing(EventImage::getSortOrder, Comparator.nullsLast(Integer::compareTo)))
            .map(image -> EventImageResponse.builder()
                .id(image.getId())
                .imageUrl(image.getImageUrl())
                .isCover(image.isCover())
                .sortOrder(image.getSortOrder())
                .build())
            .toList();
    }
}
