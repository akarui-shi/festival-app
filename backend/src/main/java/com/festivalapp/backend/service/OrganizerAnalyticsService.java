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
import com.festivalapp.backend.entity.Organization;
import com.festivalapp.backend.entity.Registration;
import com.festivalapp.backend.entity.RegistrationStatus;
import com.festivalapp.backend.entity.RoleName;
import com.festivalapp.backend.entity.Session;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.entity.UserRole;
import com.festivalapp.backend.exception.BadRequestException;
import com.festivalapp.backend.exception.ResourceNotFoundException;
import com.festivalapp.backend.exception.UnauthorizedException;
import com.festivalapp.backend.repository.EventRepository;
import com.festivalapp.backend.repository.FavoriteRepository;
import com.festivalapp.backend.repository.OrganizerRepository;
import com.festivalapp.backend.repository.RegistrationRepository;
import com.festivalapp.backend.repository.ReviewRepository;
import com.festivalapp.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrganizerAnalyticsService {

    private static final int DEFAULT_TRENDS_DAYS = 30;
    private static final int MAX_TRENDS_DAYS = 365;
    private static final int OVERVIEW_SESSION_LOAD_LIMIT = 10;
    private static final DateTimeFormatter SESSION_LABEL_FORMATTER = DateTimeFormatter.ofPattern("dd.MM HH:mm", Locale.ROOT);
    private static final Set<RegistrationStatus> ACTIVE_REGISTRATION_STATUSES = EnumSet.of(RegistrationStatus.CREATED);

    private final UserRepository userRepository;
    private final OrganizerRepository organizerRepository;
    private final EventRepository eventRepository;
    private final RegistrationRepository registrationRepository;
    private final FavoriteRepository favoriteRepository;
    private final ReviewRepository reviewRepository;
    private final YandexMetrikaService yandexMetrikaService;

    @Transactional(readOnly = true)
    public OrganizerAnalyticsOverviewResponse getOverview(String actorIdentifier, LocalDate fromDate, LocalDate toDate) {
        User actor = loadActor(actorIdentifier);
        DateRange range = resolveDateRange(fromDate, toDate);
        List<Event> events = loadAvailableEvents(actor);

        List<Long> eventIds = events.stream()
            .map(Event::getId)
            .filter(Objects::nonNull)
            .toList();

        List<Session> sessions = events.stream()
            .flatMap(event -> event.getSessions().stream())
            .filter(Objects::nonNull)
            .toList();

        Map<Long, Integer> occupiedSeatsBySessionId = resolveOccupiedSeatsBySessionId(sessions.stream()
            .map(Session::getId)
            .filter(Objects::nonNull)
            .toList());

        long registrations = eventIds.isEmpty()
            ? 0L
            : registrationRepository.countBySessionEventIdInAndStatus(eventIds, RegistrationStatus.CREATED);

        int activeParticipants = occupiedSeatsBySessionId.values().stream()
            .mapToInt(Integer::intValue)
            .sum();

        long favorites = eventIds.isEmpty() ? 0L : favoriteRepository.countByEventIdIn(eventIds);
        double averageRating = eventIds.isEmpty() ? 0.0d : decimalToDouble(reviewRepository.averageRatingByEventIds(eventIds));

        List<Registration> registrationTrends = eventIds.isEmpty()
            ? List.of()
            : registrationRepository.findAllByEventIdsAndStatusesAndCreatedAtBetween(
                eventIds,
                ACTIVE_REGISTRATION_STATUSES,
                range.fromDate().atStartOfDay(),
                range.toDate().plusDays(1).atStartOfDay()
            );

        List<AnalyticsDatePointResponse> registrationsByDay = buildContinuousSeries(
            aggregateRegistrationsByDay(registrationTrends),
            range
        );

        List<AnalyticsSessionLoadResponse> sessionLoads = buildSessionLoads(sessions, occupiedSeatsBySessionId).stream()
            .sorted(Comparator.comparingInt(AnalyticsSessionLoadResponse::getActiveParticipants).reversed()
                .thenComparing(AnalyticsSessionLoadResponse::getStartAt, Comparator.nullsLast(Comparator.naturalOrder())))
            .limit(OVERVIEW_SESSION_LOAD_LIMIT)
            .toList();

        AggregatedTraffic aggregatedTraffic = aggregateTraffic(events, range);

        return OrganizerAnalyticsOverviewResponse.builder()
            .fromDate(range.fromDate())
            .toDate(range.toDate())
            .kpi(OrganizerAnalyticsOverviewResponse.OverviewKpi.builder()
                .pageViews(aggregatedTraffic.pageViews())
                .uniqueVisitors(aggregatedTraffic.uniqueVisitors())
                .registrations(registrations)
                .activeParticipants(activeParticipants)
                .favorites(favorites)
                .averageRating(averageRating)
                .build())
            .visitsByDay(aggregatedTraffic.visitsByDay())
            .registrationsByDay(registrationsByDay)
            .trafficSources(aggregatedTraffic.trafficSources())
            .sessionLoads(sessionLoads)
            .metrika(aggregatedTraffic.status())
            .build();
    }

    @Transactional(readOnly = true)
    public OrganizerEventAnalyticsResponse getEventAnalytics(Long eventId,
                                                             String actorIdentifier,
                                                             LocalDate fromDate,
                                                             LocalDate toDate) {
        User actor = loadActor(actorIdentifier);
        DateRange range = resolveDateRange(fromDate, toDate);
        Event event = loadEvent(eventId, actor);

        OrganizerEventEngagementResponse engagement = buildEngagement(event, range);
        OrganizerEventTrafficResponse traffic = buildTraffic(event, range);

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
        User actor = loadActor(actorIdentifier);
        DateRange range = resolveDateRange(fromDate, toDate);
        Event event = loadEvent(eventId, actor);
        return buildEngagement(event, range);
    }

    @Transactional(readOnly = true)
    public OrganizerEventTrafficResponse getEventTraffic(Long eventId,
                                                         String actorIdentifier,
                                                         LocalDate fromDate,
                                                         LocalDate toDate) {
        User actor = loadActor(actorIdentifier);
        DateRange range = resolveDateRange(fromDate, toDate);
        Event event = loadEvent(eventId, actor);
        return buildTraffic(event, range);
    }

    private OrganizerEventEngagementResponse buildEngagement(Event event, DateRange range) {
        List<Session> sessions = event.getSessions().stream()
            .sorted(Comparator.comparing(Session::getStartTime, Comparator.nullsLast(Comparator.naturalOrder())))
            .toList();

        List<Long> sessionIds = sessions.stream()
            .map(Session::getId)
            .filter(Objects::nonNull)
            .toList();

        Map<Long, Integer> occupiedSeatsBySessionId = resolveOccupiedSeatsBySessionId(sessionIds);

        long registrationsCount = registrationRepository.countBySessionEventIdAndStatus(event.getId(), RegistrationStatus.CREATED);
        long cancellationsCount = registrationRepository.countBySessionEventIdAndStatus(event.getId(), RegistrationStatus.CANCELLED);

        int activeParticipants = occupiedSeatsBySessionId.values().stream()
            .mapToInt(Integer::intValue)
            .sum();

        int averageSessionOccupancyPercent = calculateAverageSessionOccupancyPercent(sessions, occupiedSeatsBySessionId);

        long favoritesCount = favoriteRepository.countByEventId(event.getId());
        long reviewsCount = reviewRepository.countByEventId(event.getId());
        double averageRating = decimalToDouble(reviewRepository.averageRatingByEventId(event.getId()));

        List<Registration> registrationTrendRows = registrationRepository.findAllByEventIdAndStatusesAndCreatedAtBetween(
            event.getId(),
            ACTIVE_REGISTRATION_STATUSES,
            range.fromDate().atStartOfDay(),
            range.toDate().plusDays(1).atStartOfDay()
        );

        List<AnalyticsDatePointResponse> registrationsByDay = buildContinuousSeries(
            aggregateRegistrationsByDay(registrationTrendRows),
            range
        );

        return OrganizerEventEngagementResponse.builder()
            .eventId(event.getId())
            .eventTitle(event.getTitle())
            .eventPath(resolveEventPath(event.getId()))
            .registrationsCount(registrationsCount)
            .cancellationsCount(cancellationsCount)
            .activeRegistrations(registrationsCount)
            .activeParticipants(activeParticipants)
            .sessionsCount(sessions.size())
            .averageSessionOccupancyPercent(averageSessionOccupancyPercent)
            .favoritesCount(favoritesCount)
            .reviewsCount(reviewsCount)
            .averageRating(averageRating)
            .registrationsByDay(registrationsByDay)
            .sessionLoads(buildSessionLoads(sessions, occupiedSeatsBySessionId))
            .build();
    }

    private OrganizerEventTrafficResponse buildTraffic(Event event, DateRange range) {
        String eventPath = resolveEventPath(event.getId());
        YandexMetrikaService.EventTrafficReport report = yandexMetrikaService.loadEventTraffic(
            eventPath,
            range.fromDate(),
            range.toDate()
        );

        List<AnalyticsDatePointResponse> visitsByDay = buildContinuousSeries(
            report.getVisitsByDay().stream().collect(Collectors.toMap(
                AnalyticsDatePointResponse::getDate,
                AnalyticsDatePointResponse::getValue,
                Long::sum,
                LinkedHashMap::new
            )),
            range
        );

        return OrganizerEventTrafficResponse.builder()
            .eventId(event.getId())
            .eventPath(eventPath)
            .pageViews(report.getPageViews())
            .uniqueVisitors(report.getUniqueVisitors())
            .bounceRate(report.getBounceRate())
            .pageDepth(report.getPageDepth())
            .trafficSources(report.getTrafficSources())
            .visitsByDay(visitsByDay)
            .metrika(report.getStatus())
            .build();
    }

    private AggregatedTraffic aggregateTraffic(List<Event> events, DateRange range) {
        if (events.isEmpty()) {
            YandexMetrikaStatusResponse configurationStatus = yandexMetrikaService.getConfigurationStatus();
            YandexMetrikaStatusResponse noEventsStatus = YandexMetrikaStatusResponse.builder()
                .enabled(configurationStatus.isEnabled())
                .configured(configurationStatus.isConfigured())
                .available(false)
                .message("У организатора пока нет мероприятий для внешней аналитики.")
                .warnings(List.of())
                .build();
            return new AggregatedTraffic(0L, 0L, List.of(), buildContinuousSeries(Map.of(), range), noEventsStatus);
        }

        if (!yandexMetrikaService.isEnabled() || !yandexMetrikaService.isConfigured()) {
            return new AggregatedTraffic(
                0L,
                0L,
                List.of(),
                buildContinuousSeries(Map.of(), range),
                yandexMetrikaService.getConfigurationStatus()
            );
        }

        long pageViews = 0L;
        long uniqueVisitors = 0L;
        int availableReports = 0;

        Map<LocalDate, Long> visitsByDay = new LinkedHashMap<>();
        Map<String, Long> sourceVisits = new LinkedHashMap<>();
        List<String> warnings = new ArrayList<>();

        for (Event event : events) {
            Long eventId = event.getId();
            if (eventId == null) {
                continue;
            }

            YandexMetrikaService.EventTrafficReport report = yandexMetrikaService.loadEventTraffic(
                resolveEventPath(eventId),
                range.fromDate(),
                range.toDate()
            );

            if (!report.getStatus().isAvailable()) {
                String eventTitle = StringUtils.hasText(event.getTitle()) ? event.getTitle().trim() : "мероприятие #" + eventId;
                warnings.add(eventTitle + ": " + report.getStatus().getMessage());
                continue;
            }

            availableReports += 1;
            pageViews += report.getPageViews();
            uniqueVisitors += report.getUniqueVisitors();

            for (AnalyticsDatePointResponse point : report.getVisitsByDay()) {
                if (point == null || point.getDate() == null) {
                    continue;
                }
                visitsByDay.merge(point.getDate(), point.getValue(), Long::sum);
            }

            for (AnalyticsTrafficSourceResponse source : report.getTrafficSources()) {
                if (source == null || !StringUtils.hasText(source.getSource())) {
                    continue;
                }
                sourceVisits.merge(source.getSource(), source.getVisits(), Long::sum);
            }

            if (report.getStatus().getWarnings() != null) {
                for (String reportWarning : report.getStatus().getWarnings()) {
                    if (StringUtils.hasText(reportWarning)) {
                        warnings.add(reportWarning.trim());
                    }
                }
            }
        }

        List<AnalyticsTrafficSourceResponse> trafficSources = buildTrafficSources(sourceVisits);

        YandexMetrikaStatusResponse status;
        if (availableReports == 0) {
            status = YandexMetrikaStatusResponse.builder()
                .enabled(true)
                .configured(true)
                .available(false)
                .message("Не удалось получить внешнюю аналитику из Яндекс Метрики.")
                .warnings(trimWarnings(warnings))
                .build();
        } else if (warnings.isEmpty()) {
            status = YandexMetrikaStatusResponse.builder()
                .enabled(true)
                .configured(true)
                .available(true)
                .message("Данные Яндекс Метрики загружены.")
                .warnings(List.of())
                .build();
        } else {
            status = YandexMetrikaStatusResponse.builder()
                .enabled(true)
                .configured(true)
                .available(true)
                .message("Данные Яндекс Метрики загружены частично.")
                .warnings(trimWarnings(warnings))
                .build();
        }

        return new AggregatedTraffic(
            pageViews,
            uniqueVisitors,
            trafficSources,
            buildContinuousSeries(visitsByDay, range),
            status
        );
    }

    private List<AnalyticsTrafficSourceResponse> buildTrafficSources(Map<String, Long> sourceVisits) {
        if (sourceVisits.isEmpty()) {
            return List.of();
        }

        long totalVisits = sourceVisits.values().stream().mapToLong(Long::longValue).sum();
        if (totalVisits <= 0L) {
            return List.of();
        }

        return sourceVisits.entrySet().stream()
            .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
            .map(entry -> AnalyticsTrafficSourceResponse.builder()
                .source(entry.getKey())
                .visits(entry.getValue())
                .sharePercent(roundToOneDecimal(entry.getValue() * 100.0d / totalVisits))
                .build())
            .toList();
    }

    private Map<LocalDate, Long> aggregateRegistrationsByDay(Collection<Registration> registrations) {
        if (registrations == null || registrations.isEmpty()) {
            return Map.of();
        }

        Map<LocalDate, Long> values = new LinkedHashMap<>();
        for (Registration registration : registrations) {
            if (registration == null || registration.getCreatedAt() == null) {
                continue;
            }
            LocalDate date = registration.getCreatedAt().toLocalDate();
            long quantity = registration.getQuantity() == null ? 1L : registration.getQuantity();
            values.merge(date, quantity, Long::sum);
        }
        return values;
    }

    private List<AnalyticsDatePointResponse> buildContinuousSeries(Map<LocalDate, Long> valuesByDate, DateRange range) {
        Map<LocalDate, Long> safeValues = valuesByDate == null ? Map.of() : valuesByDate;
        List<AnalyticsDatePointResponse> result = new ArrayList<>();
        LocalDate cursor = range.fromDate();

        while (!cursor.isAfter(range.toDate())) {
            result.add(AnalyticsDatePointResponse.builder()
                .date(cursor)
                .value(safeValues.getOrDefault(cursor, 0L))
                .build());
            cursor = cursor.plusDays(1);
        }

        return result;
    }

    private List<AnalyticsSessionLoadResponse> buildSessionLoads(List<Session> sessions,
                                                                 Map<Long, Integer> occupiedSeatsBySessionId) {
        if (sessions == null || sessions.isEmpty()) {
            return List.of();
        }

        return sessions.stream()
            .filter(Objects::nonNull)
            .map(session -> {
                int capacity = resolveSessionCapacity(session);
                int activeParticipants = occupiedSeatsBySessionId.getOrDefault(session.getId(), 0);
                String label = resolveSessionLabel(session);

                return AnalyticsSessionLoadResponse.builder()
                    .sessionId(session.getId())
                    .label(label)
                    .startAt(session.getStartTime())
                    .capacity(capacity > 0 ? capacity : null)
                    .activeParticipants(activeParticipants)
                    .occupancyPercent(calculateOccupancyPercent(activeParticipants, capacity))
                    .build();
            })
            .toList();
    }

    private String resolveSessionLabel(Session session) {
        if (session == null) {
            return "Сеанс";
        }

        String eventTitle = session.getEvent() != null && StringUtils.hasText(session.getEvent().getTitle())
            ? session.getEvent().getTitle().trim()
            : "Мероприятие";

        if (session.getStartTime() == null) {
            return eventTitle;
        }

        return eventTitle + " • " + SESSION_LABEL_FORMATTER.format(session.getStartTime());
    }

    private Map<Long, Integer> resolveOccupiedSeatsBySessionId(List<Long> sessionIds) {
        if (sessionIds == null || sessionIds.isEmpty()) {
            return Map.of();
        }

        List<Object[]> rows = registrationRepository.sumParticipantsBySessionIdsAndStatuses(sessionIds, ACTIVE_REGISTRATION_STATUSES);
        Map<Long, Integer> occupiedBySessionId = new LinkedHashMap<>();

        for (Object[] row : rows) {
            if (row == null || row.length < 2) {
                continue;
            }

            Number sessionId = (Number) row[0];
            Number value = (Number) row[1];
            if (sessionId == null) {
                continue;
            }

            occupiedBySessionId.put(sessionId.longValue(), value == null ? 0 : value.intValue());
        }

        return occupiedBySessionId;
    }

    private int calculateAverageSessionOccupancyPercent(List<Session> sessions, Map<Long, Integer> occupiedSeatsBySessionId) {
        if (sessions == null || sessions.isEmpty()) {
            return 0;
        }

        int sessionsWithCapacity = 0;
        int totalPercent = 0;

        for (Session session : sessions) {
            int capacity = resolveSessionCapacity(session);
            if (capacity <= 0) {
                continue;
            }

            int occupied = occupiedSeatsBySessionId.getOrDefault(session.getId(), 0);
            totalPercent += calculateOccupancyPercent(occupied, capacity);
            sessionsWithCapacity += 1;
        }

        if (sessionsWithCapacity == 0) {
            return 0;
        }

        return Math.round((float) totalPercent / sessionsWithCapacity);
    }

    private int resolveSessionCapacity(Session session) {
        if (session == null || session.getCapacity() == null) {
            return 0;
        }
        return Math.max(0, session.getCapacity());
    }

    private int calculateOccupancyPercent(int occupiedSeats, int capacity) {
        if (capacity <= 0) {
            return 0;
        }
        double ratio = occupiedSeats * 100.0d / capacity;
        return (int) Math.round(Math.max(0.0d, ratio));
    }

    private double decimalToDouble(BigDecimal value) {
        if (value == null) {
            return 0.0d;
        }
        return roundToOneDecimal(value.doubleValue());
    }

    private double roundToOneDecimal(double value) {
        return Math.round(value * 10.0d) / 10.0d;
    }

    private List<String> trimWarnings(List<String> warnings) {
        if (warnings == null || warnings.isEmpty()) {
            return List.of();
        }

        return warnings.stream()
            .filter(StringUtils::hasText)
            .map(String::trim)
            .distinct()
            .limit(5)
            .toList();
    }

    private String resolveEventPath(Long eventId) {
        return "/events/" + eventId;
    }

    private DateRange resolveDateRange(LocalDate fromDate, LocalDate toDate) {
        LocalDate today = LocalDate.now();
        LocalDate effectiveTo = toDate == null ? today : toDate;
        LocalDate effectiveFrom = fromDate == null ? effectiveTo.minusDays(DEFAULT_TRENDS_DAYS - 1L) : fromDate;

        if (effectiveFrom.isAfter(effectiveTo)) {
            throw new BadRequestException("Параметр from не может быть больше to.");
        }

        long totalDays = effectiveFrom.datesUntil(effectiveTo.plusDays(1)).count();
        if (totalDays > MAX_TRENDS_DAYS) {
            throw new BadRequestException("Диапазон аналитики не должен превышать " + MAX_TRENDS_DAYS + " дней.");
        }

        return new DateRange(effectiveFrom, effectiveTo);
    }

    private User loadActor(String actorIdentifier) {
        return userRepository.findByLoginOrEmailWithRoles(actorIdentifier)
            .orElseThrow(() -> new UnauthorizedException("Unauthorized user"));
    }

    private List<Event> loadAvailableEvents(User actor) {
        Sort sort = Sort.by(Sort.Direction.DESC, "createdAt");

        if (hasRole(actor, RoleName.ROLE_ADMIN) && !hasRole(actor, RoleName.ROLE_ORGANIZER)) {
            return eventRepository.findAll((Specification<Event>) null, sort);
        }

        Organization organization = resolveActorOrganization(actor);
        return eventRepository.findAllByOrganizationId(organization.getId(), sort);
    }

    private Event loadEvent(Long eventId, User actor) {
        Event event = eventRepository.findDetailedById(eventId)
            .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + eventId));

        if (hasRole(actor, RoleName.ROLE_ADMIN) && !hasRole(actor, RoleName.ROLE_ORGANIZER)) {
            return event;
        }

        Organization organization = resolveActorOrganization(actor);
        Long actorOrganizationId = organization.getId();
        Long eventOrganizationId = event.getOrganization() != null ? event.getOrganization().getId() : null;
        if (!Objects.equals(actorOrganizationId, eventOrganizationId)) {
            throw new AccessDeniedException("You do not have access to this event");
        }

        return event;
    }

    private Organization resolveActorOrganization(User actor) {
        if (!hasRole(actor, RoleName.ROLE_ORGANIZER)) {
            throw new AccessDeniedException("Only organizers can access organizer analytics");
        }

        return organizerRepository.findByUserId(actor.getId())
            .map(com.festivalapp.backend.entity.Organizer::getOrganization)
            .orElseThrow(() -> new BadRequestException("Организатор не привязан к организации. Обратитесь к администратору."));
    }

    private boolean hasRole(User user, RoleName roleName) {
        return user.getUserRoles().stream()
            .map(UserRole::getRole)
            .filter(Objects::nonNull)
            .map(role -> role.getName())
            .anyMatch(roleName::equals);
    }

    private record DateRange(LocalDate fromDate, LocalDate toDate) {
    }

    private record AggregatedTraffic(long pageViews,
                                     long uniqueVisitors,
                                     List<AnalyticsTrafficSourceResponse> trafficSources,
                                     List<AnalyticsDatePointResponse> visitsByDay,
                                     YandexMetrikaStatusResponse status) {
    }
}
