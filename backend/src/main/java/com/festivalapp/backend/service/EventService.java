package com.festivalapp.backend.service;

import com.festivalapp.backend.dto.EventCreateRequest;
import com.festivalapp.backend.dto.CategoryResponse;
import com.festivalapp.backend.dto.EventDetailsResponse;
import com.festivalapp.backend.dto.EventShortResponse;
import com.festivalapp.backend.dto.EventUpdateRequest;
import com.festivalapp.backend.dto.VenueResponse;
import com.festivalapp.backend.entity.Category;
import com.festivalapp.backend.entity.Event;
import com.festivalapp.backend.entity.EventStatus;
import com.festivalapp.backend.entity.Organizer;
import com.festivalapp.backend.entity.RoleName;
import com.festivalapp.backend.entity.Session;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.entity.Venue;
import com.festivalapp.backend.exception.BadRequestException;
import com.festivalapp.backend.exception.ResourceNotFoundException;
import com.festivalapp.backend.repository.CategoryRepository;
import com.festivalapp.backend.repository.EventRepository;
import com.festivalapp.backend.repository.OrganizerRepository;
import com.festivalapp.backend.repository.UserRepository;
import jakarta.persistence.criteria.JoinType;
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
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
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
    private final OrganizerRepository organizerRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<EventShortResponse> getAll(String title,
                                           Long categoryId,
                                           Long venueId,
                                           Long cityId,
                                           String status,
                                           String sortBy,
                                           String sortDir) {
        EventStatus eventStatus = parseStatus(status);
        Specification<Event> specification = buildSpecification(title, categoryId, venueId, cityId, eventStatus);
        Sort sort = buildSort(sortBy, sortDir);

        return eventRepository.findAll(specification, sort).stream()
            .map(this::toShortResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public EventDetailsResponse getById(Long id) {
        Event event = eventRepository.findDetailedById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + id));
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

            Organizer organizer = resolveActorOrganizer(actor);
            if (organizer == null) {
                throw new ResourceNotFoundException("Organizer profile not found for current user");
            }
            events = eventRepository.findAllByOrganizerId(organizer.getId(), sort);
        }

        return events.stream()
            .map(this::toShortResponse)
            .toList();
    }

    @Transactional
    public EventShortResponse create(EventCreateRequest request, String actorIdentifier) {
        User actor = loadActor(actorIdentifier);
        Organizer organizer = resolveOrganizerForCreate(actor, request.getOrganizerId());

        Set<Category> categories = resolveCategories(request.getCategoryIds());

        Event event = Event.builder()
            .title(request.getTitle())
            .shortDescription(request.getShortDescription())
            .fullDescription(request.getFullDescription())
            .ageRating(request.getAgeRating())
            .coverUrl(request.getCoverUrl())
            .createdAt(LocalDateTime.now())
            .status(request.getStatus() == null ? EventStatus.DRAFT : request.getStatus())
            .organizer(organizer)
            .categories(categories)
            .build();

        return toShortResponse(eventRepository.save(event));
    }

    @Transactional
    public EventShortResponse update(Long id, EventUpdateRequest request, String actorIdentifier) {
        User actor = loadActor(actorIdentifier);
        Event event = eventRepository.findDetailedById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + id));
        validateUpdateOrDeleteAccess(actor, event);

        if (request.getOrganizerId() != null) {
            updateOrganizerIfNeeded(actor, event, request.getOrganizerId());
        }

        if (request.getTitle() != null) {
            event.setTitle(request.getTitle());
        }
        if (request.getShortDescription() != null) {
            event.setShortDescription(request.getShortDescription());
        }
        if (request.getFullDescription() != null) {
            event.setFullDescription(request.getFullDescription());
        }
        if (request.getAgeRating() != null) {
            event.setAgeRating(request.getAgeRating());
        }
        if (request.getCoverUrl() != null) {
            event.setCoverUrl(request.getCoverUrl());
        }
        if (request.getStatus() != null) {
            event.setStatus(request.getStatus());
        }
        if (request.getCategoryIds() != null) {
            event.setCategories(resolveCategories(request.getCategoryIds()));
        }

        return toShortResponse(eventRepository.save(event));
    }

    @Transactional
    public Map<String, Object> delete(Long id, String actorIdentifier) {
        User actor = loadActor(actorIdentifier);
        Event event = eventRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + id));
        validateUpdateOrDeleteAccess(actor, event);

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

    private Organizer resolveOrganizerForCreate(User actor, Long organizerId) {
        Organizer actorOrganizer = resolveActorOrganizer(actor);

        if (hasRole(actor, RoleName.ROLE_ADMIN)) {
            if (organizerId != null) {
                return organizerRepository.findById(organizerId)
                    .orElseThrow(() -> new ResourceNotFoundException("Organizer not found: " + organizerId));
            }
            if (actorOrganizer != null) {
                return actorOrganizer;
            }
            throw new BadRequestException("Organizer ID is required for admin without organizer profile");
        }

        if (!hasRole(actor, RoleName.ROLE_ORGANIZER)) {
            throw new AccessDeniedException("Only organizers or admins can create events");
        }

        if (actorOrganizer == null) {
            throw new ResourceNotFoundException("Organizer profile not found for current user");
        }

        if (organizerId != null && !organizerId.equals(actorOrganizer.getId())) {
            throw new AccessDeniedException("Organizer can create events only for own organizer profile");
        }

        return actorOrganizer;
    }

    private Organizer resolveActorOrganizer(User actor) {
        if (actor.getOrganizer() != null) {
            return actor.getOrganizer();
        }
        return organizerRepository.findByUserId(actor.getId()).orElse(null);
    }

    private void validateUpdateOrDeleteAccess(User actor, Event event) {
        if (hasRole(actor, RoleName.ROLE_ADMIN)) {
            return;
        }

        // Organizers can only manage events linked to their own organizer profile.
        if (!hasRole(actor, RoleName.ROLE_ORGANIZER)) {
            throw new AccessDeniedException("Only organizers or admins can manage events");
        }

        if (actor.getOrganizer() == null || event.getOrganizer() == null
            || !actor.getOrganizer().getId().equals(event.getOrganizer().getId())) {
            throw new AccessDeniedException("Organizer can manage only own events");
        }
    }

    private void updateOrganizerIfNeeded(User actor, Event event, Long organizerId) {
        if (!hasRole(actor, RoleName.ROLE_ADMIN) && !organizerId.equals(event.getOrganizer().getId())) {
            throw new AccessDeniedException("Organizer cannot reassign event to another organizer");
        }

        if (organizerId.equals(event.getOrganizer().getId())) {
            return;
        }

        Organizer organizer = organizerRepository.findById(organizerId)
            .orElseThrow(() -> new ResourceNotFoundException("Organizer not found: " + organizerId));
        event.setOrganizer(organizer);
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
                predicates.add(cb.equal(
                    root.join("sessions", JoinType.LEFT).join("venue", JoinType.LEFT).get("id"),
                    venueId
                ));
            }
            if (cityId != null) {
                predicates.add(cb.equal(
                    root.join("sessions", JoinType.LEFT)
                        .join("venue", JoinType.LEFT)
                        .join("city", JoinType.LEFT)
                        .get("id"),
                    cityId
                ));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
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
        return EventShortResponse.builder()
            .id(event.getId())
            .title(event.getTitle())
            .shortDescription(event.getShortDescription())
            .ageRating(event.getAgeRating())
            .createdAt(event.getCreatedAt())
            .status(event.getStatus())
            .organizerName(event.getOrganizer() != null ? event.getOrganizer().getName() : null)
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
            .organizer(toOrganizerSummary(event.getOrganizer()))
            .categories(toCategoryResponses(event.getCategories()))
            .venues(extractVenues(event.getSessions()))
            .build();
    }

    private EventDetailsResponse.OrganizerSummary toOrganizerSummary(Organizer organizer) {
        if (organizer == null) {
            return null;
        }

        return EventDetailsResponse.OrganizerSummary.builder()
            .id(organizer.getId())
            .name(organizer.getName())
            .description(organizer.getDescription())
            .contacts(organizer.getContacts())
            .build();
    }

    private List<CategoryResponse> toCategoryResponses(Set<Category> categories) {
        return categories.stream()
            .sorted(Comparator.comparing(Category::getName, String.CASE_INSENSITIVE_ORDER))
            .map(category -> CategoryResponse.builder()
                .id(category.getId())
                .name(category.getName())
                .build())
            .toList();
    }

    private List<VenueResponse> extractVenues(Set<Session> sessions) {
        Map<Long, VenueResponse> uniqueVenues = sessions.stream()
            .map(Session::getVenue)
            .filter(Objects::nonNull)
            .collect(Collectors.toMap(
                Venue::getId,
                this::toVenueResponse,
                (left, right) -> left,
                LinkedHashMap::new
            ));

        return uniqueVenues.values().stream().toList();
    }

    private VenueResponse toVenueResponse(Venue venue) {
        return VenueResponse.builder()
            .id(venue.getId())
            .name(venue.getName())
            .address(venue.getAddress())
            .capacity(venue.getCapacity())
            .cityId(venue.getCity() != null ? venue.getCity().getId() : null)
            .cityName(venue.getCity() != null ? venue.getCity().getName() : null)
            .build();
    }
}
