package com.festivalapp.backend.service;

import com.festivalapp.backend.entity.Order;
import com.festivalapp.backend.entity.OrderItem;
import com.festivalapp.backend.entity.Session;
import com.festivalapp.backend.entity.Ticket;
import com.festivalapp.backend.entity.TicketType;
import com.festivalapp.backend.entity.User;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private static final int QR_IMAGE_SIZE = 360;
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm");

    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final RestClient.Builder restClientBuilder;

    @Value("${app.notifications.telegram-bot-token:}")
    private String telegramBotToken;

    @Value("${app.notifications.telegram-chat-id:}")
    private String telegramChatId;

    @Value("${app.notifications.email-from:noreply@festival.local}")
    private String emailFrom;

    public void notifyTicketIssued(User user, Order order, List<Ticket> tickets) {
        if (user == null || !StringUtils.hasText(user.getEmail()) || order == null || tickets == null || tickets.isEmpty()) {
            return;
        }

        if (order.getTotalAmount() == null || order.getTotalAmount().compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }

        if (!"оплачен".equalsIgnoreCase(order.getStatus())) {
            return;
        }

        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            log.warn("Email sender is not configured. Set MAIL_HOST/MAIL_PORT/MAIL_USERNAME/MAIL_PASSWORD. Cannot send tickets to {}", user.getEmail());
            return;
        }

        String subject = "Ваши билеты по заказу #" + order.getId();
        String body = buildTicketEmailBody(user, order, tickets);

        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, StandardCharsets.UTF_8.name());
            helper.setFrom(emailFrom);
            helper.setTo(user.getEmail().trim());
            helper.setSubject(subject);
            helper.setText(body, false);

            int attachmentIndex = 1;
            for (Ticket ticket : tickets) {
                if (ticket == null || !StringUtils.hasText(ticket.getQrToken())) {
                    continue;
                }
                byte[] qrPng = generateQrPng(ticket.getQrToken());
                String filename = "ticket-" + (ticket.getId() == null ? attachmentIndex : ticket.getId()) + "-qr.png";
                helper.addAttachment(filename, new ByteArrayResource(qrPng));
                attachmentIndex++;
            }

            mailSender.send(mimeMessage);
            sendTelegram("Отправлены билеты на email: заказ #" + order.getId() + ", пользователь " + user.getEmail());
        } catch (Exception ex) {
            log.warn("Failed to send ticket email to {}: {}", user.getEmail(), ex.getMessage());
        }
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
            String errorMessage = ex.getMessage() == null ? "" : ex.getMessage().toLowerCase(Locale.ROOT);
            if (errorMessage.contains("authentication failed")) {
                return EmailSendResult.failure("AUTH_FAILED");
            }
            if (errorMessage.contains("timed out") || errorMessage.contains("connect")) {
                return EmailSendResult.failure("CONNECTION_FAILED");
            }
            return EmailSendResult.failure("SEND_FAILED");
        }
    }

    private byte[] generateQrPng(String value) {
        try {
            QRCodeWriter writer = new QRCodeWriter();
            BitMatrix matrix = writer.encode(value, BarcodeFormat.QR_CODE, QR_IMAGE_SIZE, QR_IMAGE_SIZE);
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(matrix, "PNG", outputStream);
            return outputStream.toByteArray();
        } catch (WriterException | java.io.IOException ex) {
            throw new IllegalStateException("Failed to generate QR image", ex);
        }
    }

    private String buildTicketEmailBody(User user, Order order, List<Ticket> tickets) {
        String firstName = StringUtils.hasText(user.getFirstName()) ? user.getFirstName().trim() : "пользователь";
        StringBuilder builder = new StringBuilder();

        builder.append("Здравствуйте, ").append(firstName).append("!\n\n");
        builder.append("Ваш заказ оформлен успешно. Билеты и QR-коды приложены к этому письму.\n");
        builder.append("Заказ: #").append(order == null ? "-" : order.getId()).append("\n");
        if (order != null && order.getEvent() != null && StringUtils.hasText(order.getEvent().getTitle())) {
            builder.append("Мероприятие: ").append(order.getEvent().getTitle()).append("\n");
        }
        if (order != null && order.getTotalAmount() != null) {
            builder.append("Сумма: ").append(formatMoney(order.getTotalAmount(), order.getCurrency())).append("\n");
        }

        builder.append("\nБилеты:\n");
        for (Ticket ticket : tickets) {
            builder.append(formatTicketLine(ticket)).append("\n");
        }

        builder.append("\nПокажите QR-код из вложения на входе. Приятного посещения!");
        return builder.toString();
    }

    private String formatMoney(BigDecimal amount, String currency) {
        String normalizedCurrency = StringUtils.hasText(currency) ? currency.trim().toUpperCase(Locale.ROOT) : "RUB";
        return amount.stripTrailingZeros().toPlainString() + " " + normalizedCurrency;
    }

    private String formatTicketLine(Ticket ticket) {
        if (ticket == null) {
            return "- Билет";
        }

        StringBuilder line = new StringBuilder();
        line.append("- Билет #").append(ticket.getId() == null ? "-" : ticket.getId());

        Session session = ticket.getSession();
        if (session != null && session.getStartsAt() != null) {
            line.append(", ").append(session.getStartsAt().toLocalDateTime().format(DATE_TIME_FORMATTER));
        }

        if (session != null && session.getVenue() != null && StringUtils.hasText(session.getVenue().getName())) {
            line.append(", ").append(session.getVenue().getName().trim());
        }

        OrderItem orderItem = ticket.getOrderItem();
        TicketType ticketType = orderItem == null ? null : orderItem.getTicketType();
        if (ticketType != null && StringUtils.hasText(ticketType.getName())) {
            line.append(", тип: ").append(ticketType.getName().trim());
        }

        return line.toString();
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
