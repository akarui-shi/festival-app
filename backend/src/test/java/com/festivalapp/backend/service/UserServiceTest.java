package com.festivalapp.backend.service;

import com.festivalapp.backend.dto.ChangePasswordRequest;
import com.festivalapp.backend.dto.CurrentUserResponse;
import com.festivalapp.backend.dto.UpdateCurrentUserRequest;
import com.festivalapp.backend.entity.Role;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.entity.UserRole;
import com.festivalapp.backend.exception.BadRequestException;
import com.festivalapp.backend.exception.ResourceNotFoundException;
import com.festivalapp.backend.repository.ImageRepository;
import com.festivalapp.backend.repository.OrganizationMemberRepository;
import com.festivalapp.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit-тесты для {@link UserService} — сервиса профиля пользователя.
 * Уровень: unit. Мокируются UserRepository, PasswordEncoder и EmailVerificationService.
 * Проверяются: получение профиля, обновление логина/email (включая проверку уникальности),
 * смена пароля (текущий пароль, запрет на совпадение с новым).
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class UserServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private OrganizationMemberRepository organizationMemberRepository;
    @Mock private ImageRepository imageRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private EmailVerificationService emailVerificationService;

    @InjectMocks
    private UserService userService;

    private User user;

    // Пользователь «alice» с хешем пароля «hashed_pw» и ролью «Житель».
    // organizationMemberRepository возвращает пустой список — alice не организатор.
    @BeforeEach
    void setUp() {
        user = buildUser(1L, "alice", "alice@example.com", "hashed_pw");
        when(userRepository.findByLoginOrEmailWithRoles("alice")).thenReturn(Optional.of(user));
        when(organizationMemberRepository.findAllByUserIdAndLeftAtIsNull(1L)).thenReturn(List.of());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    // ─── getCurrentUser ───────────────────────────────────────────────────────

    // Получение собственного профиля: DTO содержит login и email.
    @Test
    void getCurrentUser_existingUser_returnsResponse() {
        CurrentUserResponse resp = userService.getCurrentUser("alice");

        assertThat(resp).isNotNull();
        assertThat(resp.getLogin()).isEqualTo("alice");
        assertThat(resp.getEmail()).isEqualTo("alice@example.com");
    }

    // Неизвестный пользователь → ResourceNotFoundException (401 должен был перехватить Spring Security,
    // но этот метод вызывается после авторизации — защита на случай рассинхронизации JWT и БД).
    @Test
    void getCurrentUser_unknownUser_throwsNotFound() {
        when(userRepository.findByLoginOrEmailWithRoles("ghost")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.getCurrentUser("ghost"))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    // ─── updateCurrentUser ────────────────────────────────────────────────────

    // Попытка занять уже существующий логин другого пользователя → BadRequestException «Логин уже занят».
    // existsByLoginAndIdNot исключает текущего пользователя из проверки уникальности.
    @Test
    void updateCurrentUser_duplicateLogin_throwsBadRequest() {
        when(userRepository.existsByLoginAndIdNot("taken", 1L)).thenReturn(true);

        UpdateCurrentUserRequest req = new UpdateCurrentUserRequest();
        req.setLogin("taken");
        req.setEmail("alice@example.com");

        assertThatThrownBy(() -> userService.updateCurrentUser("alice", req))
            .isInstanceOf(BadRequestException.class)
            .hasMessageContaining("Логин уже занят");
    }

    // Email другого пользователя → BadRequestException «Электронная почта уже используется».
    @Test
    void updateCurrentUser_duplicateEmail_throwsBadRequest() {
        when(userRepository.existsByLoginAndIdNot(anyString(), anyLong())).thenReturn(false);
        when(userRepository.existsByEmailAndIdNot("taken@example.com", 1L)).thenReturn(true);

        UpdateCurrentUserRequest req = new UpdateCurrentUserRequest();
        req.setLogin("alice");
        req.setEmail("taken@example.com");

        assertThatThrownBy(() -> userService.updateCurrentUser("alice", req))
            .isInstanceOf(BadRequestException.class)
            .hasMessageContaining("Электронная почта уже используется");
    }

    // Happy-path смены логина: уникальный логин принимается, save() вызывается, ответ содержит новый логин.
    @Test
    void updateCurrentUser_changesLoginSuccessfully() {
        when(userRepository.existsByLoginAndIdNot(anyString(), anyLong())).thenReturn(false);
        when(userRepository.existsByEmailAndIdNot(anyString(), anyLong())).thenReturn(false);
        when(userRepository.existsByPendingEmailAndIdNot(anyString(), anyLong())).thenReturn(false);

        UpdateCurrentUserRequest req = new UpdateCurrentUserRequest();
        req.setLogin("new_alice");
        req.setEmail("alice@example.com");

        CurrentUserResponse resp = userService.updateCurrentUser("alice", req);

        assertThat(resp.getLogin()).isEqualTo("new_alice");
        verify(userRepository).save(any(User.class));
    }

    // ─── changeCurrentUserPassword ────────────────────────────────────────────

    // Неверный текущий пароль → BadRequestException «Текущий пароль указан неверно».
    // passwordEncoder.matches() возвращает false — хеши не совпадают.
    @Test
    void changePassword_wrongCurrentPassword_throwsBadRequest() {
        when(passwordEncoder.matches("wrong_pw", "hashed_pw")).thenReturn(false);

        ChangePasswordRequest req = new ChangePasswordRequest();
        req.setCurrentPassword("wrong_pw");
        req.setNewPassword("NewPass5678");

        assertThatThrownBy(() -> userService.changeCurrentUserPassword("alice", req))
            .isInstanceOf(BadRequestException.class)
            .hasMessageContaining("Текущий пароль указан неверно");
    }

    // Новый пароль совпадает со старым → BadRequestException «Новый пароль должен отличаться».
    // Смена на тот же пароль бессмысленна и нарушает политику безопасности.
    @Test
    void changePassword_samePasswordAsNew_throwsBadRequest() {
        when(passwordEncoder.matches("Pass1234", "hashed_pw")).thenReturn(true);

        ChangePasswordRequest req = new ChangePasswordRequest();
        req.setCurrentPassword("Pass1234");
        req.setNewPassword("Pass1234");

        assertThatThrownBy(() -> userService.changeCurrentUserPassword("alice", req))
            .isInstanceOf(BadRequestException.class)
            .hasMessageContaining("Новый пароль должен отличаться от текущего");
    }

    // Happy-path смены пароля: encode() кодирует новый пароль, save() сохраняет изменения.
    // verify(passwordEncoder).encode() проверяет, что используется именно новый пароль.
    @Test
    void changePassword_validRequest_encodesAndSaves() {
        when(passwordEncoder.matches("Pass1234", "hashed_pw")).thenReturn(true);
        when(passwordEncoder.encode("NewPass5678")).thenReturn("new_hashed_pw");

        ChangePasswordRequest req = new ChangePasswordRequest();
        req.setCurrentPassword("Pass1234");
        req.setNewPassword("NewPass5678");

        userService.changeCurrentUserPassword("alice", req);

        verify(passwordEncoder).encode("NewPass5678");
        verify(userRepository).save(any(User.class));
    }

    // ─── helpers ──────────────────────────────────────────────────────────────

    // Строит тестового пользователя с ролью «Житель» и переданным хешем пароля.
    // id для UserRole вычисляется через id+1000, чтобы избежать коллизий с id самого пользователя.
    private User buildUser(Long id, String login, String email, String passwordHash) {
        Role role = Role.builder().id(1L).name("Житель").build();
        User u = User.builder()
            .id(id)
            .login(login)
            .email(email)
            .emailVerified(true)
            .passwordHash(passwordHash)
            .firstName("Test")
            .lastName("User")
            .registeredAt(OffsetDateTime.now())
            .active(true)
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
        UserRole ur = UserRole.builder().id(id + 1000).user(u).role(role).assignedAt(OffsetDateTime.now()).build();
        u.setUserRoles(Set.of(ur));
        return u;
    }
}
