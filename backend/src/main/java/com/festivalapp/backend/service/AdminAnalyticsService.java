package com.festivalapp.backend.service;

import com.festivalapp.backend.dto.AnalyticsDatePointResponse;
import com.festivalapp.backend.dto.AnalyticsSessionLoadResponse;
import com.festivalapp.backend.dto.AnalyticsTrafficSourceResponse;
import com.festivalapp.backend.dto.OrganizerAnalyticsOverviewResponse;
import com.festivalapp.backend.dto.YandexMetrikaStatusResponse;
import com.festivalapp.backend.entity.Event;
import com.festivalapp.backend.entity.EventStatus;
import com.festivalapp.backend.entity.Session;
import com.festivalapp.backend.entity.Ticket;
import com.festivalapp.backend.exception.BadRequestException;
import com.festivalapp.backend.repository.CommentRepository;
import com.festivalapp.backend.repository.EventRepository;
import com.festivalapp.backend.repository.FavoriteRepository;
import com.festivalapp.backend.repository.SessionRepository;
import com.festivalapp.backend.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AdminAnalyticsService {

    private final EventRepository eventRepository;
    private final SessionRepository sessionRepository;
    private final TicketRepository ticketRepository;
    private final FavoriteRepository favoriteRepository;
    private final CommentRepository commentRepository;
    private final YandexMetrikaService yandexMetrikaService;

    @Transactional(readOnly = true)
    public OrganizerAnalyticsOverviewResponse getOverview(LocalDate fromDate, LocalDate toDate) {
        DateRange range = normalizeRange(fromDate, toDate);
        List<Event> events = eventRepository.findAllByDeletedAtIsNullOrderByCreatedAtDesc();

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
        List<Event> publishedEvents = events.stream()
            .filter(event -> DomainStatusMapper.toEventStatus(event.getStatus()) == EventStatus.PUBLISHED)
            .toList();

        if (publishedEvents.isEmpty()) {
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

        for (Event event : publishedEvents) {
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
