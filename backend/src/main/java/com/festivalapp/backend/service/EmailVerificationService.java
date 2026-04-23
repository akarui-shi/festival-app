package com.festivalapp.backend.service;

import com.festivalapp.backend.dto.MessageResponse;
import com.festivalapp.backend.entity.EmailVerificationPurpose;
import com.festivalapp.backend.entity.EmailVerificationToken;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.exception.BadRequestException;
import com.festivalapp.backend.repository.EmailVerificationTokenRepository;
import com.festivalapp.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.util.UriComponentsBuilder;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class EmailVerificationService {

    private static final int TOKEN_BYTES = 32;

    private final EmailVerificationTokenRepository emailVerificationTokenRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${app.frontend-base-url:http://localhost:5173}")
    private String frontendBaseUrl;

    @Value("${app.email-verification.token-ttl-hours:24}")
    private long tokenTtlHours;

    @Transactional
    public void sendRegistrationVerification(User user) {
        if (user == null || !StringUtils.hasText(user.getEmail())) {
            return;
        }

        createAndSendToken(user, EmailVerificationPurpose.REGISTER, user.getEmail());
    }

    @Transactional
    public void sendEmailChangeVerification(User user, String newEmail) {
        if (user == null || !StringUtils.hasText(newEmail)) {
            return;
        }

        createAndSendToken(user, EmailVerificationPurpose.CHANGE_EMAIL, newEmail);
    }

    @Transactional
    public MessageResponse confirmEmail(String token) {
        String normalizedToken = normalizeRequired(token, "Некорректный токен подтверждения");

        EmailVerificationToken verificationToken = emailVerificationTokenRepository.findByToken(normalizedToken)
            .orElseThrow(() -> new BadRequestException("Ссылка подтверждения недействительна"));

        OffsetDateTime now = OffsetDateTime.now();
        if (verificationToken.getUsedAt() != null) {
            throw new BadRequestException("Эта ссылка уже была использована");
        }
        if (verificationToken.getExpiresAt().isBefore(now)) {
            throw new BadRequestException("Срок действия ссылки истек");
        }

        User user = verificationToken.getUser();
        if (!user.isActive()) {
            throw new BadRequestException("Учетная запись заблокирована");
        }

        EmailVerificationPurpose purpose = verificationToken.getPurpose();
        String targetEmail = verificationToken.getTargetEmail();

        if (purpose == EmailVerificationPurpose.REGISTER) {
            if (!equalsIgnoreCase(user.getEmail(), targetEmail)) {
                throw new BadRequestException("Ссылка подтверждения устарела");
            }
            user.setEmailVerified(true);
            user.setUpdatedAt(now);
        } else if (purpose == EmailVerificationPurpose.CHANGE_EMAIL) {
            if (!StringUtils.hasText(user.getPendingEmail()) || !equalsIgnoreCase(user.getPendingEmail(), targetEmail)) {
                throw new BadRequestException("Ссылка подтверждения устарела");
            }
            if (userRepository.existsByEmailAndIdNot(targetEmail, user.getId())) {
                throw new BadRequestException("Электронная почта уже используется");
            }

            user.setEmail(targetEmail);
            user.setPendingEmail(null);
            user.setEmailVerified(true);
            user.setUpdatedAt(now);
        }

        verificationToken.setUsedAt(now);
        userRepository.save(user);
        emailVerificationTokenRepository.save(verificationToken);
        expireOtherTokens(user.getId(), purpose, verificationToken.getId(), now);

        return MessageResponse.builder()
            .message(purpose == EmailVerificationPurpose.CHANGE_EMAIL
                ? "Новый email успешно подтвержден"
                : "Email успешно подтвержден")
            .build();
    }

    private void createAndSendToken(User user, EmailVerificationPurpose purpose, String targetEmail) {
        OffsetDateTime now = OffsetDateTime.now();
        expireActiveTokens(user.getId(), purpose, now);

        EmailVerificationToken verificationToken = emailVerificationTokenRepository.save(EmailVerificationToken.builder()
            .user(user)
            .token(generateToken())
            .purpose(purpose)
            .targetEmail(targetEmail)
            .expiresAt(now.plusHours(tokenTtlHours))
            .createdAt(now)
            .build());

        String verifyUrl = buildVerificationUrl(verificationToken.getToken());
        String subject = purpose == EmailVerificationPurpose.CHANGE_EMAIL
            ? "Подтвердите новый email"
            : "Подтвердите email";
        String body = buildEmailBody(user, verifyUrl, purpose);

        NotificationService.EmailSendResult sendResult = notificationService.sendEmailMessage(targetEmail, subject, body);
        if (!sendResult.success()) {
            throw new BadRequestException(resolveEmailSendError(sendResult.reason()));
        }
    }

    private void expireActiveTokens(Long userId, EmailVerificationPurpose purpose, OffsetDateTime now) {
        List<EmailVerificationToken> activeTokens = emailVerificationTokenRepository
            .findAllByUserIdAndPurposeAndUsedAtIsNull(userId, purpose);
        for (EmailVerificationToken activeToken : activeTokens) {
            activeToken.setUsedAt(now);
        }
        if (!activeTokens.isEmpty()) {
            emailVerificationTokenRepository.saveAll(activeTokens);
        }
    }

    private void expireOtherTokens(Long userId,
                                   EmailVerificationPurpose purpose,
                                   Long currentTokenId,
                                   OffsetDateTime now) {
        List<EmailVerificationToken> activeTokens = emailVerificationTokenRepository
            .findAllByUserIdAndPurposeAndUsedAtIsNull(userId, purpose);
        for (EmailVerificationToken activeToken : activeTokens) {
            if (!activeToken.getId().equals(currentTokenId)) {
                activeToken.setUsedAt(now);
            }
        }
        if (!activeTokens.isEmpty()) {
            emailVerificationTokenRepository.saveAll(activeTokens);
        }
    }

    private String buildVerificationUrl(String token) {
        String normalizedBase = normalizeBaseUrl(frontendBaseUrl);
        return UriComponentsBuilder.fromUriString(normalizedBase)
            .path("/verify-email")
            .queryParam("token", token)
            .build()
            .toUriString();
    }

    private String normalizeBaseUrl(String value) {
        String normalized = normalizeRequired(value, "Не настроен frontend-base-url");
        if (normalized.endsWith("/")) {
            return normalized.substring(0, normalized.length() - 1);
        }
        return normalized;
    }

    private String buildEmailBody(User user, String verifyUrl, EmailVerificationPurpose purpose) {
        String firstName = StringUtils.hasText(user.getFirstName()) ? user.getFirstName().trim() : "пользователь";
        String actionText = purpose == EmailVerificationPurpose.CHANGE_EMAIL
            ? "Вы запросили смену email в профиле."
            : "Спасибо за регистрацию. Подтвердите email для входа в аккаунт.";

        return "Здравствуйте, " + firstName + "!\n\n"
            + actionText + "\n"
            + "Перейдите по ссылке:\n"
            + verifyUrl + "\n\n"
            + "Ссылка действует " + tokenTtlHours + " ч. Если это были не вы, просто проигнорируйте письмо.";
    }

    private String generateToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private boolean equalsIgnoreCase(String left, String right) {
        if (!StringUtils.hasText(left) || !StringUtils.hasText(right)) {
            return false;
        }
        return left.trim().toLowerCase(Locale.ROOT).equals(right.trim().toLowerCase(Locale.ROOT));
    }

    private String normalizeRequired(String value, String message) {
        if (!StringUtils.hasText(value)) {
            throw new BadRequestException(message);
        }
        return value.trim();
    }

    private String resolveEmailSendError(String reason) {
        if (!StringUtils.hasText(reason)) {
            return "Не удалось отправить письмо подтверждения. Настройте SMTP: MAIL_HOST, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD.";
        }

        return switch (reason) {
            case "AUTH_FAILED" ->
                "SMTP отклонил авторизацию. Для Gmail укажите пароль приложения в MAIL_PASSWORD, а не обычный пароль.";
            case "CONNECTION_FAILED" ->
                "Нет соединения с SMTP-сервером. Проверьте MAIL_HOST/MAIL_PORT и доступность сети (для Gmail обычно работает 465 + SSL).";
            case "NOT_CONFIGURED" ->
                "SMTP не настроен. Заполните MAIL_HOST, MAIL_PORT, MAIL_USERNAME и MAIL_PASSWORD.";
            default ->
                "Не удалось отправить письмо подтверждения. Проверьте SMTP-настройки и попробуйте снова.";
        };
    }
}
