package com.festivalapp.backend.service;

import com.festivalapp.backend.entity.Order;
import com.festivalapp.backend.entity.Ticket;
import com.festivalapp.backend.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final RestClient.Builder restClientBuilder;

    @Value("${app.notifications.telegram-bot-token:}")
    private String telegramBotToken;

    @Value("${app.notifications.telegram-chat-id:}")
    private String telegramChatId;

    @Value("${app.notifications.email-from:noreply@festival.local}")
    private String emailFrom;

    public void notifyTicketIssued(User user, Order order, List<Ticket> tickets) {
        if (user == null || tickets == null || tickets.isEmpty()) {
            return;
        }

        String ticketList = tickets.stream()
            .map(ticket -> "- Билет #" + ticket.getId() + ", QR: " + ticket.getQrToken())
            .collect(Collectors.joining("\n"));

        String subject = "Ваш билет на мероприятие";
        String body = "Здравствуйте, " + user.getFirstName() + "!\n\n"
            + "Оплата/регистрация прошла успешно.\n"
            + "Заказ: #" + order.getId() + "\n"
            + "Мероприятие: " + (order.getEvent() == null ? "-" : order.getEvent().getTitle()) + "\n\n"
            + "Ваши билеты:\n" + ticketList + "\n\n"
            + "Покажите QR-код на входе.";

        sendEmail(user.getEmail(), subject, body);
        sendTelegram("Новый оформленный билет: заказ #" + order.getId() + ", пользователь " + user.getEmail());
    }

    public EmailSendResult sendEmailMessage(String to, String subject, String body) {
        return sendEmail(to, subject, body);
    }

    private EmailSendResult sendEmail(String to, String subject, String body) {
        if (!StringUtils.hasText(to)) {
            return EmailSendResult.failure("INVALID_RECIPIENT");
        }

        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            log.warn("Email sender is not configured. Set MAIL_HOST/MAIL_PORT/MAIL_USERNAME/MAIL_PASSWORD. Mock email to {} with subject '{}'", to, subject);
            return EmailSendResult.failure("NOT_CONFIGURED");
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(emailFrom);
            message.setTo(to.trim());
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
            return EmailSendResult.ok();
        } catch (Exception ex) {
            log.warn("Failed to send email notification to {}: {}", to, ex.getMessage());
            String message = ex.getMessage() == null ? "" : ex.getMessage().toLowerCase();
            if (message.contains("authentication failed")) {
                return EmailSendResult.failure("AUTH_FAILED");
            }
            if (message.contains("timed out") || message.contains("connect")) {
                return EmailSendResult.failure("CONNECTION_FAILED");
            }
            return EmailSendResult.failure("SEND_FAILED");
        }
    }

    private void sendTelegram(String text) {
        if (!StringUtils.hasText(telegramBotToken) || !StringUtils.hasText(telegramChatId)) {
            log.info("Telegram is not configured. Mock telegram notification: {}", text);
            return;
        }

        String baseUrl = "https://api.telegram.org";
        try {
            restClientBuilder.baseUrl(baseUrl)
                .build()
                .post()
                .uri("/bot{token}/sendMessage", telegramBotToken)
                .body(java.util.Map.of(
                    "chat_id", telegramChatId,
                    "text", text
                ))
                .retrieve()
                .toBodilessEntity();
        } catch (Exception ex) {
            log.warn("Failed to send telegram notification: {}", ex.getMessage());
        }
    }

    public record EmailSendResult(boolean success, String reason) {
        public static EmailSendResult ok() {
            return new EmailSendResult(true, "OK");
        }

        public static EmailSendResult failure(String reason) {
            return new EmailSendResult(false, reason);
        }
    }
}
