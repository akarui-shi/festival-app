package com.festivalapp.backend.service;

import com.festivalapp.backend.dto.SessionCreateRequest;
import com.festivalapp.backend.dto.SessionDetailsResponse;
import com.festivalapp.backend.dto.SessionRegistrationResponse;
import com.festivalapp.backend.dto.SessionShortResponse;
import com.festivalapp.backend.dto.SessionUpdateRequest;
import com.festivalapp.backend.entity.Event;
import com.festivalapp.backend.entity.EventStatus;
import com.festivalapp.backend.entity.Organizer;
import com.festivalapp.backend.entity.Registration;
import com.festivalapp.backend.entity.RegistrationStatus;
import com.festivalapp.backend.entity.RoleName;
import com.festivalapp.backend.entity.Session;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.entity.Venue;
import com.festivalapp.backend.exception.BadRequestException;
import com.festivalapp.backend.exception.ResourceNotFoundException;
import com.festivalapp.backend.repository.EventRepository;
import com.festivalapp.backend.repository.RegistrationRepository;
import com.festivalapp.backend.repository.SessionRepository;
import com.festivalapp.backend.repository.UserRepository;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class SessionService {

    private static final Set<RegistrationStatus> ACTIVE_REGISTRATION_STATUSES =
        Set.of(RegistrationStatus.CREATED);

    private final SessionRepository sessionRepository;
    private final EventRepository eventRepository;
    private final RegistrationRepository registrationRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<SessionShortResponse> getAll(Long eventId,
                                             Long venueId,
                                             Long cityId,
                                             LocalDate dateFrom,
                                             LocalDate dateTo,
                                             String actorIdentifier) {
        validateDateFilterRange(dateFrom, dateTo);
        User viewer = resolveViewer(actorIdentifier);

        Specification<Session> specification = buildSpecification(eventId, venueId, cityId, dateFrom, dateTo, viewer);
        List<Session> sessions = sessionRepository.findAll(specification, Sort.by(Sort.Direction.ASC, "startTime"));

        Map<Long, Integer> reservedSeatsBySessionId = getReservedSeatsBySessionIds(
            sessions.stream().map(Session::getId).toList()
        );

        return sessions.stream()
            .map(session -> toShortResponse(session, reservedSeatsBySessionId.getOrDefault(session.getId(), 0)))
            .toList();
    }

    @Transactional(readOnly = true)
    public SessionDetailsResponse getById(Long id, String actorIdentifier) {
        User viewer = resolveViewer(actorIdentifier);
        Session session = sessionRepository.findDetailedById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Session not found: " + id));

        if (!canViewSession(viewer, session.getEvent())) {
            throw new ResourceNotFoundException("Session not found: " + id);
        }

        int reservedSeats = getReservedSeats(session.getId());
        return toDetailsResponse(session, reservedSeats);
    }

    @Transactional
    public SessionDetailsResponse create(SessionCreateRequest request, String actorIdentifier) {
        User actor = loadActor(actorIdentifier);

        Event event = eventRepository.findDetailedById(request.getEventId())
            .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + request.getEventId()));
        Venue venue = resolveVenueForEvent(event);

        validateOrganizerAccess(actor, event);
        validateSessionTimeRange(request.getStartAt(), request.getEndAt());
        validateSessionCapacity(request.getCapacity(), venue);
        validateVenueTimeIntersection(venue.getId(), request.getStartAt(), request.getEndAt(), null);

        Session session = Session.builder()
            .event(event)
            .startTime(request.getStartAt())
            .endTime(request.getEndAt())
            .capacity(request.getCapacity())
            .build();

        Session saved = sessionRepository.save(session);
        return toDetailsResponse(saved, 0);
    }

    @Transactional
    public SessionDetailsResponse update(Long id, SessionUpdateRequest request, String actorIdentifier) {
        User actor = loadActor(actorIdentifier);
        Session session = sessionRepository.findDetailedById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Session not found: " + id));

        Event targetEvent = request.getEventId() == null
            ? session.getEvent()
            : eventRepository.findDetailedById(request.getEventId())
                .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + request.getEventId()));
        Venue targetVenue = resolveVenueForEvent(targetEvent);

        LocalDateTime targetStart = request.getStartAt() == null ? session.getStartTime() : request.getStartAt();
        LocalDateTime targetEnd = request.getEndAt() == null ? session.getEndTime() : request.getEndAt();
        Integer targetCapacity = request.getCapacity() == null ? session.getCapacity() : request.getCapacity();

        validateOrganizerAccess(actor, targetEvent);
        validateSessionTimeRange(targetStart, targetEnd);
        validateSessionCapacity(targetCapacity, targetVenue);
        validateVenueTimeIntersection(targetVenue.getId(), targetStart, targetEnd, session.getId());

        session.setEvent(targetEvent);
        session.setStartTime(targetStart);
        session.setEndTime(targetEnd);
        session.setCapacity(targetCapacity);

        Session updated = sessionRepository.save(session);
        int reservedSeats = getReservedSeats(updated.getId());
        return toDetailsResponse(updated, reservedSeats);
    }

    @Transactional
    public Map<String, Object> delete(Long id, String actorIdentifier) {
        User actor = loadActor(actorIdentifier);
        Session session = sessionRepository.findDetailedById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Session not found: " + id));

        validateOrganizerAccess(actor, session.getEvent());

        long activeRegistrations = registrationRepository.countBySessionIdAndStatusIn(
            session.getId(),
            ACTIVE_REGISTRATION_STATUSES
        );
        if (activeRegistrations > 0) {
            throw new BadRequestException("Cannot delete session with active registrations");
        }

        sessionRepository.delete(session);
        return Map.of(
            "message", "Session deleted successfully",
            "sessionId", id
        );
    }

    @Transactional(readOnly = true)
    public List<SessionRegistrationResponse> getSessionRegistrations(Long sessionId, String actorIdentifier) {
        User actor = loadActor(actorIdentifier);
        Session session = sessionRepository.findDetailedById(sessionId)
            .orElseThrow(() -> new ResourceNotFoundException("Session not found: " + sessionId));

        validateOrganizerAccess(actor, session.getEvent());

        List<Registration> registrations = registrationRepository.findAllBySessionIdWithUser(sessionId);
        return registrations.stream()
            .map(this::toSessionRegistrationResponse)
            .toList();
    }

    private User loadActor(String actorIdentifier) {
        return userRepository.findByLoginOrEmailWithRoles(actorIdentifier)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private User resolveViewer(String actorIdentifier) {
        if (!StringUtils.hasText(actorIdentifier)) {
            return null;
        }
        return userRepository.findByLoginOrEmailWithRoles(actorIdentifier).orElse(null);
    }

    private boolean hasRole(User user, RoleName roleName) {
        return user != null && user.getUserRoles().stream()
            .anyMatch(userRole -> userRole.getRole().getName() == roleName);
    }

    private boolean canViewSession(User viewer, Event event) {
        if (event != null && event.getStatus() == EventStatus.PUBLISHED) {
            return true;
        }
        if (viewer == null) {
            return false;
        }
        if (hasRole(viewer, RoleName.ROLE_ADMIN)) {
            return true;
        }
        if (!hasRole(viewer, RoleName.ROLE_ORGANIZER)) {
            return false;
        }
        Organizer organizer = viewer.getOrganizer();
        return organizer != null
            && event != null
            && event.getOrganizer() != null
            && Objects.equals(organizer.getId(), event.getOrganizer().getId());
    }

    private void validateOrganizerAccess(User actor, Event event) {
        if (hasRole(actor, RoleName.ROLE_ADMIN)) {
            return;
        }

        if (!hasRole(actor, RoleName.ROLE_ORGANIZER)) {
            throw new AccessDeniedException("Only organizers or admins can manage sessions");
        }

        Organizer actorOrganizer = actor.getOrganizer();
        if (actorOrganizer == null || event.getOrganizer() == null
            || !Objects.equals(actorOrganizer.getId(), event.getOrganizer().getId())) {
            throw new AccessDeniedException("Organizer can manage sessions only for own events");
        }
    }

    private void validateSessionTimeRange(LocalDateTime startAt, LocalDateTime endAt) {
        if (!startAt.isBefore(endAt)) {
            throw new BadRequestException("Invalid date range: startAt must be before endAt");
        }
    }

    private void validateVenueTimeIntersection(Long venueId,
                                               LocalDateTime startAt,
                                               LocalDateTime endAt,
                                               Long excludeSessionId) {
        boolean overlapExists = sessionRepository.existsOverlappingSession(venueId, startAt, endAt, excludeSessionId);
        if (overlapExists) {
            throw new BadRequestException("Session time intersects with another session at this venue");
        }
    }

    private void validateDateFilterRange(LocalDate dateFrom, LocalDate dateTo) {
        if (dateFrom != null && dateTo != null && dateFrom.isAfter(dateTo)) {
            throw new BadRequestException("Invalid date range: dateFrom must be before or equal to dateTo");
        }
    }

    private void validateSessionCapacity(Integer capacity, Venue venue) {
        if (capacity == null || capacity < 1) {
            throw new BadRequestException("Session capacity must be greater than 0");
        }
        if (venue != null && venue.getCapacity() != null && capacity > venue.getCapacity()) {
            throw new BadRequestException("Session capacity cannot exceed venue capacity");
        }
    }

    private Specification<Session> buildSpecification(Long eventId,
                                                      Long venueId,
                                                      Long cityId,
                                                      LocalDate dateFrom,
                                                      LocalDate dateTo,
                                                      User viewer) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (query != null) {
                query.distinct(true);
            }

            Join<Session, Event> eventJoin = root.join("event", JoinType.LEFT);
            Join<Event, Venue> eventVenueJoin = eventJoin.join("venue", JoinType.LEFT);
            Join<Venue, ?> eventCityJoin = eventVenueJoin.join("city", JoinType.LEFT);

            if (eventId != null) {
                predicates.add(cb.equal(eventJoin.get("id"), eventId));
            }
            if (venueId != null) {
                predicates.add(cb.equal(eventVenueJoin.get("id"), venueId));
            }
            if (cityId != null) {
                predicates.add(cb.equal(eventCityJoin.get("id"), cityId));
            }
            if (dateFrom != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("startTime"), dateFrom.atStartOfDay()));
            }
            if (dateTo != null) {
                predicates.add(cb.lessThan(root.get("startTime"), dateTo.plusDays(1).atStartOfDay()));
            }

            if (viewer == null) {
                predicates.add(cb.equal(eventJoin.get("status"), EventStatus.PUBLISHED));
            } else if (hasRole(viewer, RoleName.ROLE_ADMIN)) {
                // Admin can list sessions for any event status.
            } else if (hasRole(viewer, RoleName.ROLE_ORGANIZER) && viewer.getOrganizer() != null) {
                predicates.add(cb.or(
                    cb.equal(eventJoin.get("status"), EventStatus.PUBLISHED),
                    cb.equal(eventJoin.get("organizer").get("id"), viewer.getOrganizer().getId())
                ));
            } else {
                predicates.add(cb.equal(eventJoin.get("status"), EventStatus.PUBLISHED));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private int getReservedSeats(Long sessionId) {
        Integer reserved = registrationRepository.sumParticipantsBySessionIdAndStatuses(
            sessionId,
            ACTIVE_REGISTRATION_STATUSES
        );
        return reserved == null ? 0 : reserved;
    }

    private Map<Long, Integer> getReservedSeatsBySessionIds(Collection<Long> sessionIds) {
        Map<Long, Integer> result = new HashMap<>();
        if (sessionIds.isEmpty()) {
            return result;
        }

        List<Object[]> rows = registrationRepository.sumParticipantsBySessionIdsAndStatuses(
            sessionIds,
            ACTIVE_REGISTRATION_STATUSES
        );
        for (Object[] row : rows) {
            Long sessionId = (Long) row[0];
            Number reserved = (Number) row[1];
            result.put(sessionId, reserved.intValue());
        }

        return result;
    }

    private SessionShortResponse toShortResponse(Session session, int reservedSeats) {
        Venue venue = resolveVenue(session);
        int totalCapacity = safeCapacity(session, venue);
        int availableSeats = Math.max(totalCapacity - reservedSeats, 0);

        return SessionShortResponse.builder()
            .id(session.getId())
            .startAt(session.getStartTime())
            .endAt(session.getEndTime())
            .eventId(session.getEvent() != null ? session.getEvent().getId() : null)
            .eventTitle(session.getEvent() != null ? session.getEvent().getTitle() : null)
            .venueId(venue != null ? venue.getId() : null)
            .venueName(venue != null ? venue.getName() : null)
            .venueAddress(venue != null ? venue.getAddress() : null)
            .cityName(venue != null && venue.getCity() != null ? venue.getCity().getName() : null)
            .latitude(venue != null ? venue.getLatitude() : null)
            .longitude(venue != null ? venue.getLongitude() : null)
            .availableSeats(availableSeats)
            .totalCapacity(totalCapacity)
            .build();
    }

    private SessionDetailsResponse toDetailsResponse(Session session, int reservedSeats) {
        Venue venue = resolveVenue(session);
        int totalCapacity = safeCapacity(session, venue);
        int availableSeats = Math.max(totalCapacity - reservedSeats, 0);

        return SessionDetailsResponse.builder()
            .id(session.getId())
            .startAt(session.getStartTime())
            .endAt(session.getEndTime())
            .availableSeats(availableSeats)
            .totalCapacity(totalCapacity)
            .event(toEventInfo(session.getEvent()))
            .venue(toVenueInfo(venue))
            .build();
    }

    private SessionDetailsResponse.EventInfo toEventInfo(Event event) {
        if (event == null) {
            return null;
        }
        return SessionDetailsResponse.EventInfo.builder()
            .id(event.getId())
            .title(event.getTitle())
            .organizerId(event.getOrganizer() != null ? event.getOrganizer().getId() : null)
            .organizerName(event.getOrganizer() != null ? event.getOrganizer().getName() : null)
            .build();
    }

    private SessionDetailsResponse.VenueInfo toVenueInfo(Venue venue) {
        if (venue == null) {
            return null;
        }
        return SessionDetailsResponse.VenueInfo.builder()
            .id(venue.getId())
            .name(venue.getName())
            .address(venue.getAddress())
            .cityName(venue.getCity() != null ? venue.getCity().getName() : null)
            .capacity(venue.getCapacity())
            .latitude(venue.getLatitude())
            .longitude(venue.getLongitude())
            .build();
    }

    private SessionRegistrationResponse toSessionRegistrationResponse(Registration registration) {
        User user = registration.getUser();
        String userFullName = ((user.getFirstName() == null ? "" : user.getFirstName()) + " "
            + (user.getLastName() == null ? "" : user.getLastName())).trim();
        if (userFullName.isEmpty()) {
            userFullName = user.getLogin();
        }

        return SessionRegistrationResponse.builder()
            .registrationId(registration.getId())
            .userId(user.getId())
            .userFullName(userFullName)
            .quantity(registration.getQuantity())
            .status(registration.getStatus())
            .qrToken(registration.getQrToken())
            .createdAt(registration.getCreatedAt())
            .build();
    }

    private int safeCapacity(Session session, Venue venue) {
        if (session != null && session.getCapacity() != null && session.getCapacity() > 0) {
            return session.getCapacity();
        }
        if (venue == null || venue.getCapacity() == null) {
            return 0;
        }
        return venue.getCapacity();
    }

    private Venue resolveVenueForEvent(Event event) {
        if (event.getVenue() == null) {
            throw new BadRequestException("Event venue is not set. Update event venue before creating sessions.");
        }
        return event.getVenue();
    }

    private Venue resolveVenue(Session session) {
        if (session == null || session.getEvent() == null) {
            return null;
        }
        return session.getEvent().getVenue();
    }
}
