package com.festivalapp.backend.service;

import com.festivalapp.backend.entity.Session;
import com.festivalapp.backend.entity.SessionWaitlist;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.repository.SessionRepository;
import com.festivalapp.backend.repository.SessionWaitlistRepository;
import com.festivalapp.backend.repository.TicketRepository;
import com.festivalapp.backend.repository.TicketTypeRepository;
import com.festivalapp.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class WaitlistService {

    private final SessionWaitlistRepository waitlistRepository;
    private final SessionRepository sessionRepository;
    private final UserRepository userRepository;
    private final TicketRepository ticketRepository;
    private final TicketTypeRepository ticketTypeRepository;
    private final NotificationService notificationService;

    @Value("${app.frontend-base-url:http://localhost:5173}")
    private String frontendBaseUrl;

    @Transactional
    public Map<String, Object> joinWaitlist(Long sessionId, String userIdentifier) {
        Session session = sessionRepository.findById(sessionId)
            .orElseThrow(() -> new IllegalArgumentException("Сеанс не найден"));

        User user = userRepository.findByLoginOrEmailWithRoles(userIdentifier)
            .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден"));

        if (waitlistRepository.existsBySessionIdAndUserId(sessionId, user.getId())) {
            long position = waitlistRepository.countBySessionIdAndStatus(sessionId, "WAITING");
            return Map.of("position", position, "alreadyInQueue", true);
        }

        SessionWaitlist entry = SessionWaitlist.builder()
            .sessionId(sessionId)
            .userId(user.getId())
            .status("WAITING")
            .createdAt(OffsetDateTime.now())
            .build();
        waitlistRepository.save(entry);

        long position = waitlistRepository.countBySessionIdAndStatus(sessionId, "WAITING");
        return Map.of("position", position, "alreadyInQueue", false);
    }

    @Transactional
    public void leaveWaitlist(Long sessionId, String userIdentifier) {
        User user = userRepository.findByLoginOrEmailWithRoles(userIdentifier)
            .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден"));

        waitlistRepository.findBySessionIdAndUserId(sessionId, user.getId())
            .ifPresent(entry -> {
                entry.setStatus("CANCELLED");
                waitlistRepository.save(entry);
            });
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getStatus(Long sessionId, String userIdentifier) {
        User user = userRepository.findByLoginOrEmailWithRoles(userIdentifier)
            .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден"));

        var entry = waitlistRepository.findBySessionIdAndUserId(sessionId, user.getId());
        long queueSize = waitlistRepository.countBySessionIdAndStatus(sessionId, "WAITING");

        if (entry.isEmpty() || "CANCELLED".equals(entry.get().getStatus())) {
            return Map.of("inQueue", false, "queueSize", queueSize);
        }

        List<SessionWaitlist> queue = waitlistRepository
            .findAllBySessionIdAndStatusOrderByCreatedAtAsc(sessionId, "WAITING");
        long position = queue.stream()
            .takeWhile(w -> !w.getUserId().equals(user.getId()))
            .count() + 1;

        return Map.of("inQueue", true, "position", position, "queueSize", queueSize);
    }

    @Transactional
    public void notifyFirstInQueue(Long sessionId) {
        List<SessionWaitlist> queue = waitlistRepository
            .findAllBySessionIdAndStatusOrderByCreatedAtAsc(sessionId, "WAITING");

        if (queue.isEmpty()) return;

        SessionWaitlist first = queue.get(0);
        first.setStatus("NOTIFIED");
        first.setNotifiedAt(OffsetDateTime.now());
        waitlistRepository.save(first);

        User user = first.getUser();
        if (user == null || !StringUtils.hasText(user.getEmail())) return;

        Session session = first.getSession();
        String eventTitle = session != null && session.getEvent() != null
            ? session.getEvent().getTitle()
            : "мероприятие";

        String safeBase = frontendBaseUrl != null && frontendBaseUrl.endsWith("/")
            ? frontendBaseUrl.substring(0, frontendBaseUrl.length() - 1)
            : frontendBaseUrl;
        String url = session != null && session.getEvent() != null
            ? safeBase + "/events/" + session.getEvent().getId()
            : safeBase;

        String firstName = StringUtils.hasText(user.getFirstName()) ? user.getFirstName().trim() : "участник";

        String subject = "Место освободилось: " + eventTitle;
        String body = "Здравствуйте, " + firstName + "!\n\n"
            + "Место на мероприятии «" + eventTitle + "» освободилось.\n"
            + "Поторопитесь — оно может быть занято другим участником!\n\n"
            + "Зарегистрируйтесь: " + url + "\n\n"
            + "Если вы уже не хотите посетить это мероприятие — просто проигнорируйте письмо.";

        notificationService.sendEmailMessage(user.getEmail(), subject, body);
        log.info("Waitlist notification sent to {} for session {}", user.getEmail(), sessionId);
    }
}
