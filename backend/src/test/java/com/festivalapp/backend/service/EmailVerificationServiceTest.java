package com.festivalapp.backend.service;

import com.festivalapp.backend.dto.MessageResponse;
import com.festivalapp.backend.entity.EmailVerificationPurpose;
import com.festivalapp.backend.entity.EmailVerificationToken;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.exception.BadRequestException;
import com.festivalapp.backend.repository.EmailVerificationTokenRepository;
import com.festivalapp.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit-тесты для {@link EmailVerificationService} — сервиса подтверждения email.
 * Уровень: unit. Мокируются EmailVerificationTokenRepository, UserRepository, NotificationService.
 * Проверяются два сценария использования токена: подтверждение регистрации (REGISTER)
 * и смена email (CHANGE_EMAIL), а также все граничные случаи: истёкший токен,
 * уже использованный токен, несуществующий токен.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class EmailVerificationServiceTest {

    @Mock private EmailVerificationTokenRepository emailVerificationTokenRepository;
    @Mock private UserRepository userRepository;
    @Mock private NotificationService notificationService;

    @InjectMocks
    private EmailVerificationService emailVerificationService;

    private User user;

    // Пользователь с emailVerified=false — стартовое состояние перед подтверждением.
    // Стаб findAllByUserIdAndPurposeAndUsedAtIsNull возвращает пустой список — имитирует
    // ситуацию, когда предыдущих активных токенов нет (новый пользователь).
    @BeforeEach
    void setUp() {
        user = User.builder()
            .id(1L).login("alice").email("alice@example.com")
            .emailVerified(false).active(true)
            .firstName("Alice").lastName("Smith")
            .registeredAt(OffsetDateTime.now())
            .createdAt(OffsetDateTime.now()).updatedAt(OffsetDateTime.now())
            .build();

        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(emailVerificationTokenRepository.save(any(EmailVerificationToken.class)))
            .thenAnswer(inv -> inv.getArgument(0));
        when(emailVerificationTokenRepository.findAllByUserIdAndPurposeAndUsedAtIsNull(any(), any()))
            .thenReturn(List.of());
    }

    // ─── confirmEmail ─────────────────────────────────────────────────────────

    // Happy-path регистрации: действующий токен типа REGISTER → emailVerified становится true,
    // пользователь сохраняется. Именно это активирует аккаунт в системе.
    @Test
    void confirmEmail_validToken_setsEmailVerified() {
        EmailVerificationToken token = buildToken("valid-token", user, EmailVerificationPurpose.REGISTER,
            "alice@example.com", OffsetDateTime.now().plusHours(24), null);
        when(emailVerificationTokenRepository.findByToken("valid-token")).thenReturn(Optional.of(token));

        MessageResponse resp = emailVerificationService.confirmEmail("valid-token");

        assertThat(resp.getMessage()).contains("Email успешно подтвержден");
        assertThat(user.isEmailVerified()).isTrue();
        verify(userRepository).save(user);
    }

    // Истёкший токен (expiresAt в прошлом) → BadRequestException «Срок действия ссылки истек».
    // Токены ограничены по времени для безопасности — нельзя верифицировать через старую ссылку.
    @Test
    void confirmEmail_expiredToken_throwsBadRequest() {
        EmailVerificationToken token = buildToken("expired-token", user, EmailVerificationPurpose.REGISTER,
            "alice@example.com", OffsetDateTime.now().minusHours(1), null);
        when(emailVerificationTokenRepository.findByToken("expired-token")).thenReturn(Optional.of(token));

        assertThatThrownBy(() -> emailVerificationService.confirmEmail("expired-token"))
            .isInstanceOf(BadRequestException.class)
            .hasMessageContaining("Срок действия ссылки истек");
    }

    // Уже использованный токен (usedAt не null) → BadRequestException «уже была использована».
    // Защита от повторного использования той же ссылки из письма.
    @Test
    void confirmEmail_alreadyUsedToken_throwsBadRequest() {
        EmailVerificationToken token = buildToken("used-token", user, EmailVerificationPurpose.REGISTER,
            "alice@example.com", OffsetDateTime.now().plusHours(24), OffsetDateTime.now().minusMinutes(5));
        when(emailVerificationTokenRepository.findByToken("used-token")).thenReturn(Optional.of(token));

        assertThatThrownBy(() -> emailVerificationService.confirmEmail("used-token"))
            .isInstanceOf(BadRequestException.class)
            .hasMessageContaining("уже была использована");
    }

    // Несуществующий токен → BadRequestException «недействительна».
    // Подделанный или повреждённый токен должен быть отклонён.
    @Test
    void confirmEmail_tokenNotFound_throwsBadRequest() {
        when(emailVerificationTokenRepository.findByToken("nonexistent")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> emailVerificationService.confirmEmail("nonexistent"))
            .isInstanceOf(BadRequestException.class)
            .hasMessageContaining("недействительна");
    }

    // Сценарий смены email (CHANGE_EMAIL): email пользователя обновляется на pendingEmail,
    // pendingEmail сбрасывается в null, а старый токен помечается использованным.
    // existsByEmailAndIdNot проверяет уникальность нового email.
    @Test
    void confirmEmail_changeEmail_updatesEmailAndClearsPending() {
        String newEmail = "newalice@example.com";
        user.setPendingEmail(newEmail);
        user.setEmailVerified(true);

        EmailVerificationToken token = buildToken("change-token", user, EmailVerificationPurpose.CHANGE_EMAIL,
            newEmail, OffsetDateTime.now().plusHours(24), null);
        when(emailVerificationTokenRepository.findByToken("change-token")).thenReturn(Optional.of(token));
        when(userRepository.existsByEmailAndIdNot(newEmail, 1L)).thenReturn(false);

        MessageResponse resp = emailVerificationService.confirmEmail("change-token");

        assertThat(resp.getMessage()).contains("Новый email успешно подтвержден");
        assertThat(user.getEmail()).isEqualTo(newEmail);
        assertThat(user.getPendingEmail()).isNull();
        verify(userRepository).save(user);
    }

    // ─── helpers ──────────────────────────────────────────────────────────────

    // Строит тестовый EmailVerificationToken. usedAt=null означает токен ещё не использован;
    // expiresAt в будущем — действующий; expiresAt в прошлом — истёкший.
    private EmailVerificationToken buildToken(String token, User user,
                                              EmailVerificationPurpose purpose,
                                              String targetEmail,
                                              OffsetDateTime expiresAt,
                                              OffsetDateTime usedAt) {
        return EmailVerificationToken.builder()
            .id(1L)
            .user(user)
            .token(token)
            .purpose(purpose)
            .targetEmail(targetEmail)
            .expiresAt(expiresAt)
            .usedAt(usedAt)
            .createdAt(OffsetDateTime.now())
            .build();
    }
}
