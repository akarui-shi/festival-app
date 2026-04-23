package com.festivalapp.backend.service;

import com.festivalapp.backend.entity.Event;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.format.DateTimeFormatter;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class EventNotificationService {

    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm");

    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Value("${app.frontend-base-url:http://localhost:5173}")
    private String frontendBaseUrl;

    @Transactional(readOnly = true)
    public void notifyNewPublishedEvent(Event event) {
        if (event == null || event.getId() == null || !StringUtils.hasText(event.getTitle())) {
            return;
        }

        List<User> recipients = userRepository
            .findAllByDeletedAtIsNullAndActiveTrueAndEmailVerifiedTrueAndNewEventsNotificationsEnabledTrueAndEmailIsNotNull();
        if (recipients.isEmpty()) {
            return;
        }

        String safeBase = frontendBaseUrl != null && frontendBaseUrl.endsWith("/")
            ? frontendBaseUrl.substring(0, frontendBaseUrl.length() - 1)
            : frontendBaseUrl;
        String eventUrl = safeBase + "/events/" + event.getId();

        String shortDescription = StringUtils.hasText(event.getShortDescription())
            ? event.getShortDescription().trim()
            : "Новое событие уже доступно на платформе.";

        String startsAtText = event.getStartsAt() == null
            ? "Уточняется"
            : event.getStartsAt().toLocalDateTime().format(DATE_TIME_FORMATTER);

        String subject = "Новое мероприятие: " + event.getTitle();

        for (User recipient : recipients) {
            String firstName = StringUtils.hasText(recipient.getFirstName())
                ? recipient.getFirstName().trim()
                : "друг";

            String body = "Здравствуйте, " + firstName + "!\n\n"
                + "Появилось новое мероприятие, которое может вам понравиться.\n\n"
                + "Название: " + event.getTitle() + "\n"
                + "Описание: " + shortDescription + "\n"
                + "Начало: " + startsAtText + "\n"
                + "Город: " + (event.getCity() == null ? "Уточняется" : event.getCity().getName()) + "\n\n"
                + "Подробнее и запись: " + eventUrl + "\n\n"
                + "Если уведомления больше не нужны, отключите их в профиле.";

            NotificationService.EmailSendResult result = notificationService
                .sendEmailMessage(recipient.getEmail(), subject, body);
            if (!result.success()) {
                log.warn("Failed to send event announcement to {}: {}", recipient.getEmail(), result.reason());
            }
        }
    }
}
