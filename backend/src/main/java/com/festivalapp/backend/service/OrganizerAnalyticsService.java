package com.festivalapp.backend.service;

import com.festivalapp.backend.dto.AnalyticsDatePointResponse;
import com.festivalapp.backend.dto.AnalyticsSessionLoadResponse;
import com.festivalapp.backend.dto.AnalyticsTrafficSourceResponse;
import com.festivalapp.backend.dto.OrganizerAnalyticsOverviewResponse;
import com.festivalapp.backend.dto.OrganizerEventAnalyticsResponse;
import com.festivalapp.backend.dto.OrganizerEventEngagementResponse;
import com.festivalapp.backend.dto.OrganizerEventTrafficResponse;
import com.festivalapp.backend.dto.YandexMetrikaStatusResponse;
import com.festivalapp.backend.entity.Event;
import com.festivalapp.backend.entity.OrganizationMember;
import com.festivalapp.backend.entity.Session;
import com.festivalapp.backend.entity.Ticket;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.exception.BadRequestException;
import com.festivalapp.backend.exception.ResourceNotFoundException;
import com.festivalapp.backend.repository.CommentRepository;
import com.festivalapp.backend.repository.EventRepository;
import com.festivalapp.backend.repository.FavoriteRepository;
import com.festivalapp.backend.repository.OrganizationMemberRepository;
import com.festivalapp.backend.repository.SessionRepository;
import com.festivalapp.backend.repository.SessionWaitlistRepository;
import com.festivalapp.backend.repository.TicketRepository;
import com.festivalapp.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class OrganizerAnalyticsService {

    private final EventRepository eventRepository;
    private final SessionRepository sessionRepository;
    private final TicketRepository ticketRepository;
    private final FavoriteRepository favoriteRepository;
    private final SessionWaitlistRepository sessionWaitlistRepository;
    private final CommentRepository commentRepository;
    private final UserRepository userRepository;
    private final OrganizationMemberRepository organizationMemberRepository;
    private final YandexMetrikaService yandexMetrikaService;

    @Transactional(readOnly = true)
    public OrganizerAnalyticsOverviewResponse getOverview(String actorIdentifier, LocalDate fromDate, LocalDate toDate) {
        User actor = resolveActor(actorIdentifier);
        DateRange range = normalizeRange(fromDate, toDate);
        List<Event> events = managedEvents(actor);

        long favorites = events.stream().mapToLong(event -> favoriteRepository.countByEventId(event.getId())).sum();

        long registrations = 0;
        int activeParticipants = 0;
        List<Session> sessions = new ArrayList<>();
        Map<LocalDate, Long> registrationsByDay = new HashMap<>();

        for (Event event : events) {
            List<Session> eventSessions = sessionRepository.findAllByEventIdOrderByStartsAtAsc(event.getId());
            sessions.addAll(eventSessions);
            for (Session session : eventSessions) {
                List<Ticket> tickets = ticketRepository.findAllBySessionIdOrderByIssuedAtDesc(session.getId());
                for (Ticket ticket : tickets) {
                    if (ticket.getIssuedAt() != null) {
                        LocalDate issuedDate = ticket.getIssuedAt().toLocalDate();
                        if (!issuedDate.isBefore(range.from()) && !issuedDate.isAfter(range.to())) {
                            registrationsByDay.merge(issuedDate, 1L, Long::sum);
                            registrations++;
                        }
                    }
                    if ("активен".equals(ticket.getStatus())) {
                        activeParticipants++;
                    }
                }
            }
        }

        List<AnalyticsDatePointResponse> registrationsSeries = buildDailySeries(range, registrationsByDay);
        List<AnalyticsSessionLoadResponse> sessionLoads = buildSessionLoads(sessions);

        YandexMetrikaService.EventTrafficReport traffic = loadCombinedTraffic(events, range);
        double averageRating = calculateAverageRating(events);

        return OrganizerAnalyticsOverviewResponse.builder()
            .fromDate(range.from())
            .toDate(range.to())
            .kpi(OrganizerAnalyticsOverviewResponse.OverviewKpi.builder()
                .pageViews(traffic.getPageViews())
                .uniqueVisitors(traffic.getUniqueVisitors())
                .registrations(registrations)
                .activeParticipants(activeParticipants)
                .favorites(favorites)
                .averageRating(averageRating)
                .build())
            .visitsByDay(traffic.getVisitsByDay())
            .registrationsByDay(registrationsSeries)
            .trafficSources(traffic.getTrafficSources())
            .sessionLoads(sessionLoads)
            .metrika(traffic.getStatus())
            .build();
    }

    @Transactional(readOnly = true)
    public OrganizerEventAnalyticsResponse getEventAnalytics(Long eventId,
                                                             String actorIdentifier,
                                                             LocalDate fromDate,
                                                             LocalDate toDate) {
        OrganizerEventEngagementResponse engagement = getEventEngagement(eventId, actorIdentifier, fromDate, toDate);
        OrganizerEventTrafficResponse traffic = getEventTraffic(eventId, actorIdentifier, fromDate, toDate);
        return OrganizerEventAnalyticsResponse.builder()
            .engagement(engagement)
            .traffic(traffic)
            .build();
    }

    @Transactional(readOnly = true)
    public OrganizerEventEngagementResponse getEventEngagement(Long eventId,
                                                               String actorIdentifier,
                                                               LocalDate fromDate,
                                                               LocalDate toDate) {
        User actor = resolveActor(actorIdentifier);
        Event event = loadManagedEvent(eventId, actor);
        DateRange range = normalizeRange(fromDate, toDate);

        List<Session> sessions = sessionRepository.findAllByEventIdOrderByStartsAtAsc(event.getId());
        Map<LocalDate, Long> daily = new LinkedHashMap<>();

        long registrationsCount = 0;
        long cancellationsCount = 0;
        long activeRegistrations = 0;
        int activeParticipants = 0;

        for (Session session : sessions) {
            List<Ticket> tickets = ticketRepository.findAllBySessionIdOrderByIssuedAtDesc(session.getId());
            for (Ticket ticket : tickets) {
                if (ticket.getIssuedAt() != null) {
                    LocalDate issued = ticket.getIssuedAt().toLocalDate();
                    if (!issued.isBefore(range.from()) && !issued.isAfter(range.to())) {
                        registrationsCount++;
                        daily.merge(issued, 1L, Long::sum);
                    }
                }
                if ("возвращён".equals(ticket.getStatus())) {
                    cancellationsCount++;
                }
                if ("активен".equals(ticket.getStatus())) {
                    activeRegistrations++;
                    activeParticipants++;
                }
            }
        }

        long favoritesCount = favoriteRepository.countByEventId(event.getId());
        long waitlistCount = sessions.stream()
            .mapToLong(s -> sessionWaitlistRepository.countBySessionIdAndStatus(s.getId(), "WAITING"))
            .sum();
        long reviewsCount = commentRepository.countByEventId(event.getId());
        Double avgRating = commentRepository.averageRatingByEventId(event.getId());
        List<AnalyticsSessionLoadResponse> sessionLoads = buildSessionLoads(sessions);

        int avgOccupancy = sessionLoads.isEmpty() ? 0 : (int) Math.round(sessionLoads.stream()
            .mapToInt(AnalyticsSessionLoadResponse::getOccupancyPercent)
            .average()
            .orElse(0));

        return OrganizerEventEngagementResponse.builder()
            .eventId(event.getId())
            .eventTitle(event.getTitle())
            .eventPath(eventPath(event.getId()))
            .registrationsCount(registrationsCount)
            .cancellationsCount(cancellationsCount)
            .activeRegistrations(activeRegistrations)
            .activeParticipants(activeParticipants)
            .sessionsCount(sessions.size())
            .averageSessionOccupancyPercent(avgOccupancy)
            .favoritesCount(favoritesCount)
            .waitlistCount(waitlistCount)
            .reviewsCount(reviewsCount)
            .averageRating(avgRating == null ? 0.0 : avgRating)
            .registrationsByDay(buildDailySeries(range, daily))
            .sessionLoads(sessionLoads)
            .build();
    }

    @Transactional(readOnly = true)
    public OrganizerEventTrafficResponse getEventTraffic(Long eventId,
                                                         String actorIdentifier,
                                                         LocalDate fromDate,
                                                         LocalDate toDate) {
        User actor = resolveActor(actorIdentifier);
        Event event = loadManagedEvent(eventId, actor);
        DateRange range = normalizeRange(fromDate, toDate);

        YandexMetrikaService.EventTrafficReport report = yandexMetrikaService
            .loadEventTraffic(eventPath(event.getId()), range.from(), range.to());

        return OrganizerEventTrafficResponse.builder()
            .eventId(event.getId())
            .eventPath(eventPath(event.getId()))
            .pageViews(report.getPageViews())
            .uniqueVisitors(report.getUniqueVisitors())
            .bounceRate(report.getBounceRate())
            .pageDepth(report.getPageDepth())
            .trafficSources(report.getTrafficSources())
            .visitsByDay(report.getVisitsByDay())
            .metrika(report.getStatus())
            .build();
    }

    private List<Event> managedEvents(User actor) {
        List<OrganizationMember> memberships = organizationMemberRepository.findAllByUserIdAndLeftAtIsNull(actor.getId());
        if (memberships.isEmpty()) {
            return List.of();
        }

        List<Event> result = new ArrayList<>();
        for (OrganizationMember membership : memberships) {
            result.addAll(eventRepository.findAllByOrganizationIdAndDeletedAtIsNullOrderByCreatedAtDesc(
                membership.getOrganization().getId()
            ));
        }
        return result;
    }

    private Event loadManagedEvent(Long eventId, User actor) {
        Event event = eventRepository.findByIdAndDeletedAtIsNull(eventId)
            .orElseThrow(() -> new ResourceNotFoundException("Event not found"));

        boolean member = organizationMemberRepository.existsByUserIdAndOrganizationIdAndLeftAtIsNull(
            actor.getId(),
            event.getOrganization().getId()
        );
        if (!member) {
            throw new BadRequestException("Недостаточно прав");
        }
        return event;
    }

    private List<AnalyticsSessionLoadResponse> buildSessionLoads(List<Session> sessions) {
        List<AnalyticsSessionLoadResponse> result = new ArrayList<>();
        for (Session session : sessions) {
            int capacity = session.getSeatLimit() == null ? 0 : session.getSeatLimit();
            int active = (int) ticketRepository.countBySessionIdAndStatus(session.getId(), "активен");
            int occupancy = capacity > 0 ? (int) Math.round((active * 100.0) / capacity) : 0;

            result.add(AnalyticsSessionLoadResponse.builder()
                .sessionId(session.getId())
                .label(session.getSessionTitle())
                .startAt(session.getStartsAt() == null ? null : session.getStartsAt().toLocalDateTime())
                .capacity(capacity)
                .activeParticipants(active)
                .occupancyPercent(occupancy)
                .build());
        }
        return result;
    }

    private List<AnalyticsDatePointResponse> buildDailySeries(DateRange range, Map<LocalDate, Long> dailyValues) {
        List<AnalyticsDatePointResponse> series = new ArrayList<>();
        LocalDate cursor = range.from();
        while (!cursor.isAfter(range.to())) {
            long value = dailyValues.getOrDefault(cursor, 0L);
            series.add(AnalyticsDatePointResponse.builder().date(cursor).value(value).build());
            cursor = cursor.plusDays(1);
        }
        return series;
    }

    private double calculateAverageRating(List<Event> events) {
        if (events.isEmpty()) {
            return 0.0;
        }

        double sum = 0;
        int count = 0;
        for (Event event : events) {
            Double avg = commentRepository.averageRatingByEventId(event.getId());
            if (avg != null) {
                sum += avg;
                count++;
            }
        }
        return count == 0 ? 0.0 : sum / count;
    }

    private YandexMetrikaService.EventTrafficReport loadCombinedTraffic(List<Event> events, DateRange range) {
        if (events.isEmpty()) {
            return YandexMetrikaService.EventTrafficReport.builder()
                .pageViews(0)
                .uniqueVisitors(0)
                .bounceRate(null)
                .pageDepth(null)
                .trafficSources(List.of())
                .visitsByDay(List.of())
                .status(yandexMetrikaService.getConfigurationStatus())
                .build();
        }

        long pageViews = 0;
        long uniqueVisitors = 0;
        List<AnalyticsTrafficSourceResponse> sources = List.of();
        List<AnalyticsDatePointResponse> visitsByDay = List.of();
        YandexMetrikaStatusResponse status = yandexMetrikaService.getConfigurationStatus();

        for (Event event : events) {
            YandexMetrikaService.EventTrafficReport report = yandexMetrikaService
                .loadEventTraffic(eventPath(event.getId()), range.from(), range.to());
            pageViews += report.getPageViews();
            uniqueVisitors += report.getUniqueVisitors();
            status = report.getStatus();
            if (sources.isEmpty() && !report.getTrafficSources().isEmpty()) {
                sources = report.getTrafficSources();
            }
            if (visitsByDay.isEmpty() && !report.getVisitsByDay().isEmpty()) {
                visitsByDay = report.getVisitsByDay();
            }
        }

        return YandexMetrikaService.EventTrafficReport.builder()
            .pageViews(pageViews)
            .uniqueVisitors(uniqueVisitors)
            .bounceRate(null)
            .pageDepth(null)
            .trafficSources(sources)
            .visitsByDay(visitsByDay)
            .status(status)
            .build();
    }

    private String eventPath(Long eventId) {
        return "/events/" + eventId;
    }

    private User resolveActor(String actorIdentifier) {
        return userRepository.findByLoginOrEmailWithRoles(actorIdentifier)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private DateRange normalizeRange(LocalDate fromDate, LocalDate toDate) {
        LocalDate to = toDate == null ? LocalDate.now(ZoneOffset.UTC) : toDate;
        LocalDate from = fromDate == null ? to.minusDays(29) : fromDate;
        if (from.isAfter(to)) {
            throw new BadRequestException("Некорректный диапазон дат");
        }
        return new DateRange(from, to);
    }

    private record DateRange(LocalDate from, LocalDate to) {
    }
}
