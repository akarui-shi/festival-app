package com.festivalapp.backend.service;

import com.festivalapp.backend.entity.Session;
import com.festivalapp.backend.entity.Ticket;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

@Slf4j
@Component
@RequiredArgsConstructor
public class EventReminderScheduler {

    private static final DateTimeFormatter DATE_TIME_FORMATTER =
        DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm").withLocale(new Locale("ru"));

    private final TicketRepository ticketRepository;
    private final NotificationService notificationService;

    @Value("${app.frontend-base-url:http://localhost:5173}")
    private String frontendBaseUrl;

    @Scheduled(cron = "0 0 * * * *")
    @Transactional(readOnly = true)
    public void sendUpcomingEventReminders() {
        OffsetDateTime from = OffsetDateTime.now().plusHours(23);
        OffsetDateTime to   = OffsetDateTime.now().plusHours(25);

        List<Ticket> tickets = ticketRepository.findActiveTicketsForSessionsStartingBetween(from, to);
        if (tickets.isEmpty()) {
            return;
        }

        log.info("Sending 24h reminders for {} ticket(s)", tickets.size());

        for (Ticket ticket : tickets) {
            User user = ticket.getUser();
            if (user == null || !StringUtils.hasText(user.getEmail())) {
                continue;
            }

            Session session = ticket.getSession();
            if (session == null) {
                continue;
            }

            String subject = buildSubject(session);
            String body    = buildBody(user, session);

            NotificationService.EmailSendResult result =
                notificationService.sendEmailMessage(user.getEmail(), subject, body);

            if (!result.success()) {
                log.warn("Failed to send reminder to {}: {}", user.getEmail(), result.reason());
            }
        }
    }

    private String buildSubject(Session session) {
        String eventTitle = session.getEvent() != null ? session.getEvent().getTitle() : "мероприятие";
        return "Напоминание: завтра — " + eventTitle;
    }

    private String buildBody(User user, Session session) {
        String firstName = StringUtils.hasText(user.getFirstName())
            ? user.getFirstName().trim()
            : "участник";

        String eventTitle = session.getEvent() != null ? session.getEvent().getTitle() : "мероприятие";
        String startTime  = session.getStartsAt() != null
            ? session.getStartsAt().toLocalDateTime().format(DATE_TIME_FORMATTER)
            : "уточняется";

        String venue = "";
        if (session.getVenue() != null && StringUtils.hasText(session.getVenue().getName())) {
            venue = "\nМесто: " + session.getVenue().getName().trim();
            if (StringUtils.hasText(session.getVenue().getAddress())) {
                venue += ", " + session.getVenue().getAddress().trim();
            }
        } else if (StringUtils.hasText(session.getManualAddress())) {
            venue = "\nМесто: " + session.getManualAddress().trim();
        }

        String safeBase = frontendBaseUrl != null && frontendBaseUrl.endsWith("/")
            ? frontendBaseUrl.substring(0, frontendBaseUrl.length() - 1)
            : frontendBaseUrl;
        String eventUrl = session.getEvent() != null
            ? safeBase + "/events/" + session.getEvent().getId()
            : safeBase;

        return "Здравствуйте, " + firstName + "!\n\n"
            + "Напоминаем, что завтра вас ждёт мероприятие.\n\n"
            + "Мероприятие: " + eventTitle + "\n"
            + "Дата и время: " + startTime
            + venue + "\n\n"
            + "Подробнее: " + eventUrl + "\n\n"
            + "Не забудьте взять QR-код из письма с билетом. Удачи!";
    }
}
