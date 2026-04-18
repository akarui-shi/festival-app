package com.festivalapp.backend.service;

import com.festivalapp.backend.dto.SessionCreateRequest;
import com.festivalapp.backend.dto.SessionDetailsResponse;
import com.festivalapp.backend.dto.SessionRegistrationResponse;
import com.festivalapp.backend.dto.SessionShortResponse;
import com.festivalapp.backend.dto.SessionUpdateRequest;
import com.festivalapp.backend.entity.Event;
import com.festivalapp.backend.entity.OrganizationMember;
import com.festivalapp.backend.entity.Session;
import com.festivalapp.backend.entity.Ticket;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.entity.Venue;
import com.festivalapp.backend.exception.BadRequestException;
import com.festivalapp.backend.exception.ResourceNotFoundException;
import com.festivalapp.backend.repository.EventRepository;
import com.festivalapp.backend.repository.OrganizationMemberRepository;
import com.festivalapp.backend.repository.SessionRepository;
import com.festivalapp.backend.repository.TicketRepository;
import com.festivalapp.backend.repository.UserRepository;
import com.festivalapp.backend.repository.VenueRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class SessionService {

    private final SessionRepository sessionRepository;
    private final EventRepository eventRepository;
    private final VenueRepository venueRepository;
    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;
    private final OrganizationMemberRepository organizationMemberRepository;

    @Transactional(readOnly = true)
    public List<SessionShortResponse> getAll(Long eventId,
                                             Long venueId,
                                             Long cityId,
                                             LocalDate dateFrom,
                                             LocalDate dateTo,
                                             String actorIdentifier) {
        List<Session> sessions;
        if (eventId != null) {
            sessions = sessionRepository.findAllByEventIdOrderByStartsAtAsc(eventId);
        } else if (dateFrom != null || dateTo != null) {
            OffsetDateTime from = dateFrom == null ? OffsetDateTime.now().minusYears(5) : dateFrom.atStartOfDay().atOffset(ZoneOffset.UTC);
            OffsetDateTime to = dateTo == null ? OffsetDateTime.now().plusYears(5) : dateTo.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);
            sessions = sessionRepository.findAllByStartsAtBetweenOrderByStartsAtAsc(from, to);
        } else {
            sessions = sessionRepository.findAllByOrderByStartsAtAsc();
        }

        return sessions.stream()
            .filter(session -> venueId == null || (session.getVenue() != null && Objects.equals(session.getVenue().getId(), venueId)))
            .filter(session -> cityId == null || resolveCityId(session) == null || Objects.equals(resolveCityId(session), cityId))
            .map(this::toShortResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public SessionDetailsResponse getById(Long id, String actorIdentifier) {
        Session session = sessionRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Session not found"));
        return toDetailsResponse(session);
    }

    @Transactional
    public SessionDetailsResponse create(SessionCreateRequest request, String actorIdentifier) {
        User actor = resolveActor(actorIdentifier);
        Event event = eventRepository.findByIdAndDeletedAtIsNull(request.getEventId())
            .orElseThrow(() -> new ResourceNotFoundException("Event not found"));
        assertCanManageEvent(actor, event);

        Venue venue = pickVenue(event);
        OffsetDateTime now = OffsetDateTime.now();

        Session session = Session.builder()
            .event(event)
            .venue(venue)
            .sessionTitle(event.getTitle())
            .startsAt(request.getStartAt().atOffset(ZoneOffset.UTC))
            .endsAt(request.getEndAt().atOffset(ZoneOffset.UTC))
            .seatLimit(request.getCapacity())
            .status("запланирован")
            .createdAt(now)
            .updatedAt(now)
            .build();

        return toDetailsResponse(sessionRepository.save(session));
    }

    @Transactional
    public SessionDetailsResponse update(Long id, SessionUpdateRequest request, String actorIdentifier) {
        User actor = resolveActor(actorIdentifier);
        Session session = sessionRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Session not found"));
        assertCanManageEvent(actor, session.getEvent());

        if (request.getEventId() != null && !Objects.equals(request.getEventId(), session.getEvent().getId())) {
            Event event = eventRepository.findByIdAndDeletedAtIsNull(request.getEventId())
                .orElseThrow(() -> new ResourceNotFoundException("Event not found"));
            assertCanManageEvent(actor, event);
            session.setEvent(event);
        }

        if (request.getStartAt() != null) {
            session.setStartsAt(request.getStartAt().atOffset(ZoneOffset.UTC));
        }
        if (request.getEndAt() != null) {
            session.setEndsAt(request.getEndAt().atOffset(ZoneOffset.UTC));
        }
        if (request.getCapacity() != null) {
            session.setSeatLimit(request.getCapacity());
        }
        session.setUpdatedAt(OffsetDateTime.now());

        return toDetailsResponse(sessionRepository.save(session));
    }

    @Transactional
    public Map<String, Object> delete(Long id, String actorIdentifier) {
        User actor = resolveActor(actorIdentifier);
        Session session = sessionRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Session not found"));
        assertCanManageEvent(actor, session.getEvent());
        sessionRepository.delete(session);
        return Map.of("success", true);
    }

    @Transactional(readOnly = true)
    public List<SessionRegistrationResponse> getSessionRegistrations(Long sessionId, String actorIdentifier) {
        User actor = resolveActor(actorIdentifier);
        Session session = sessionRepository.findById(sessionId)
            .orElseThrow(() -> new ResourceNotFoundException("Session not found"));
        assertCanManageEvent(actor, session.getEvent());

        return ticketRepository.findAllBySessionIdOrderByIssuedAtDesc(sessionId).stream()
            .map(ticket -> SessionRegistrationResponse.builder()
                .registrationId(ticket.getOrderItem() == null || ticket.getOrderItem().getOrder() == null
                    ? ticket.getId()
                    : ticket.getOrderItem().getOrder().getId())
                .userId(ticket.getUser() == null ? null : ticket.getUser().getId())
                .userFullName(ticket.getUser() == null ? null : (ticket.getUser().getFirstName() + " " + ticket.getUser().getLastName()).trim())
                .quantity(ticket.getOrderItem() == null ? 1 : ticket.getOrderItem().getQuantity())
                .status(DomainStatusMapper.toRegistrationStatus(ticket.getStatus()))
                .qrToken(ticket.getQrToken())
                .createdAt(ticket.getIssuedAt() == null ? null : ticket.getIssuedAt().toLocalDateTime())
                .build())
            .toList();
    }

    private SessionShortResponse toShortResponse(Session session) {
        long used = ticketRepository.countBySessionIdAndStatus(session.getId(), "активен");
        int capacity = session.getSeatLimit() == null ? 0 : session.getSeatLimit();
        int available = Math.max(0, capacity - (int) used);

        return SessionShortResponse.builder()
            .id(session.getId())
            .startAt(session.getStartsAt() == null ? null : session.getStartsAt().toLocalDateTime())
            .endAt(session.getEndsAt() == null ? null : session.getEndsAt().toLocalDateTime())
            .eventId(session.getEvent() == null ? null : session.getEvent().getId())
            .eventTitle(session.getEvent() == null ? null : session.getEvent().getTitle())
            .venueId(session.getVenue() == null ? null : session.getVenue().getId())
            .venueName(session.getVenue() == null ? null : session.getVenue().getName())
            .venueAddress(session.getVenue() == null ? session.getManualAddress() : session.getVenue().getAddress())
            .cityName(resolveCityName(session))
            .latitude(session.getVenue() == null ? session.getLatitude() : session.getVenue().getLatitude())
            .longitude(session.getVenue() == null ? session.getLongitude() : session.getVenue().getLongitude())
            .availableSeats(available)
            .totalCapacity(capacity)
            .build();
    }

    private SessionDetailsResponse toDetailsResponse(Session session) {
        long activeTickets = ticketRepository.countBySessionIdAndStatus(session.getId(), "активен");
        int total = session.getSeatLimit() == null ? 0 : session.getSeatLimit();

        return SessionDetailsResponse.builder()
            .id(session.getId())
            .startAt(session.getStartsAt() == null ? null : session.getStartsAt().toLocalDateTime())
            .endAt(session.getEndsAt() == null ? null : session.getEndsAt().toLocalDateTime())
            .availableSeats(Math.max(0, total - (int) activeTickets))
            .totalCapacity(total)
            .event(SessionDetailsResponse.EventInfo.builder()
                .id(session.getEvent() == null ? null : session.getEvent().getId())
                .title(session.getEvent() == null ? null : session.getEvent().getTitle())
                .organizationId(session.getEvent() == null || session.getEvent().getOrganization() == null ? null : session.getEvent().getOrganization().getId())
                .organizationName(session.getEvent() == null || session.getEvent().getOrganization() == null ? null : session.getEvent().getOrganization().getName())
                .build())
            .venue(SessionDetailsResponse.VenueInfo.builder()
                .id(session.getVenue() == null ? null : session.getVenue().getId())
                .name(session.getVenue() == null ? session.getSessionTitle() : session.getVenue().getName())
                .address(session.getVenue() == null ? session.getManualAddress() : session.getVenue().getAddress())
                .cityName(resolveCityName(session))
                .capacity(session.getVenue() == null ? session.getSeatLimit() : session.getVenue().getCapacity())
                .latitude(session.getVenue() == null ? session.getLatitude() : session.getVenue().getLatitude())
                .longitude(session.getVenue() == null ? session.getLongitude() : session.getVenue().getLongitude())
                .build())
            .build();
    }

    private User resolveActor(String actorIdentifier) {
        return userRepository.findByLoginOrEmailWithRoles(actorIdentifier)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private void assertCanManageEvent(User actor, Event event) {
        boolean owner = event.getCreatedByUser() != null && Objects.equals(event.getCreatedByUser().getId(), actor.getId());
        boolean member = organizationMemberRepository.existsByUserIdAndOrganizationIdAndLeftAtIsNull(
            actor.getId(),
            event.getOrganization().getId()
        );
        if (!owner && !member) {
            throw new BadRequestException("Недостаточно прав");
        }
    }

    private Venue pickVenue(Event event) {
        List<Session> existing = sessionRepository.findAllByEventIdOrderByStartsAtAsc(event.getId());
        if (!existing.isEmpty()) {
            return existing.get(0).getVenue();
        }
        return venueRepository.findAllByCityIdOrderByNameAsc(event.getCity().getId()).stream().findFirst().orElse(null);
    }

    private Long resolveCityId(Session session) {
        if (session.getVenue() != null && session.getVenue().getCity() != null) {
            return session.getVenue().getCity().getId();
        }
        if (session.getEvent() != null && session.getEvent().getCity() != null) {
            return session.getEvent().getCity().getId();
        }
        return null;
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
}
