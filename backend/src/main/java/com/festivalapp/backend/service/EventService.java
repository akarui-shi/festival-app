package com.festivalapp.backend.service;

import com.festivalapp.backend.dto.EventCreateRequest;
import com.festivalapp.backend.dto.CategoryResponse;
import com.festivalapp.backend.dto.EventDetailsResponse;
import com.festivalapp.backend.dto.EventImageRequest;
import com.festivalapp.backend.dto.EventImageResponse;
import com.festivalapp.backend.dto.EventShortResponse;
import com.festivalapp.backend.dto.EventUpdateRequest;
import com.festivalapp.backend.dto.VenueResponse;
import com.festivalapp.backend.entity.Category;
import com.festivalapp.backend.entity.City;
import com.festivalapp.backend.entity.Event;
import com.festivalapp.backend.entity.EventImage;
import com.festivalapp.backend.entity.EventStatus;
import com.festivalapp.backend.entity.Organization;
import com.festivalapp.backend.entity.Organizer;
import com.festivalapp.backend.entity.RoleName;
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
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EventService {

    private final EventRepository eventRepository;
    private final EventCategoryRepository eventCategoryRepository;
    private final EventImageRepository eventImageRepository;
    private final OrganizerRepository organizerRepository;
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

    private EventShortResponse toShortResponse(Event event) {
        Venue venue = event.getVenue();
        return EventShortResponse.builder()
            .id(event.getId())
            .title(event.getTitle())
            .shortDescription(event.getShortDescription())
            .ageRating(event.getAgeRating())
            .createdAt(event.getCreatedAt())
            .status(event.getStatus())
            .organizationName(event.getOrganization() != null ? event.getOrganization().getName() : null)
            .venueId(venue != null ? venue.getId() : null)
            .venueName(venue != null ? venue.getName() : null)
            .venueAddress(venue != null ? venue.getAddress() : null)
            .cityName(venue != null && venue.getCity() != null ? venue.getCity().getName() : null)
            .categories(toCategoryResponses(event.getCategories()))
            .coverUrl(event.getCoverUrl())
            .build();
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
