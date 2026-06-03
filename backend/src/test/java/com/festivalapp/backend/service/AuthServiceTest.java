package com.festivalapp.backend.service;

import com.festivalapp.backend.dto.AuthResponse;
import com.festivalapp.backend.dto.LoginRequest;
import com.festivalapp.backend.dto.RegisterRequest;
import com.festivalapp.backend.dto.RegisterResponse;
import com.festivalapp.backend.entity.City;
import com.festivalapp.backend.entity.Organization;
import com.festivalapp.backend.entity.OrganizationJoinRequest;
import com.festivalapp.backend.entity.OrganizationMember;
import com.festivalapp.backend.entity.Role;
import com.festivalapp.backend.entity.RoleName;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.entity.UserRole;
import com.festivalapp.backend.exception.BadRequestException;
import com.festivalapp.backend.exception.UnauthorizedException;
import com.festivalapp.backend.repository.CityRepository;
import com.festivalapp.backend.repository.OrganizationJoinRequestRepository;
import com.festivalapp.backend.repository.OrganizationMemberRepository;
import com.festivalapp.backend.repository.OrganizationRepository;
import com.festivalapp.backend.repository.RoleRepository;
import com.festivalapp.backend.repository.UserRepository;
import com.festivalapp.backend.repository.UserRoleRepository;
import com.festivalapp.backend.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit-тесты для {@link AuthService} — сервиса регистрации и входа пользователей.
 * Уровень: unit. Мокируются все зависимости (репозитории, PasswordEncoder, JwtService, EmailVerificationService).
 * Проверяются: бизнес-правила регистрации, корректность сохранения данных, поведение при ошибках.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private RoleRepository roleRepository;
    @Mock private OrganizationRepository organizationRepository;
    @Mock private OrganizationMemberRepository organizationMemberRepository;
    @Mock private OrganizationJoinRequestRepository organizationJoinRequestRepository;
    @Mock private UserRoleRepository userRoleRepository;
    @Mock private CityRepository cityRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtService jwtService;
    @Mock private EmailVerificationService emailVerificationService;
    @Mock private LoginAttemptService loginAttemptService;

    @InjectMocks
    private AuthService authService;

    private City defaultCity;
    private Role residentRole;
    private Role organizerRole;
    private AtomicLong idSeq;

    // Создаём минимальный набор справочных данных:
    // - defaultCity «Коломна» — используется при создании организаций без явного города,
    // - роли RESIDENT и ORGANIZER — нужны при сохранении UserRole,
    // - idSeq — монотонный счётчик для симуляции AUTO_INCREMENT при save().
    @BeforeEach
    void setUp() {
        defaultCity = City.builder().id(1L).name("Коломна").active(true).build();
        residentRole = Role.builder().id(1L).name("Житель").build();
        organizerRole = Role.builder().id(2L).name("Организатор").build();
        idSeq = new AtomicLong(100);

        when(cityRepository.findFirstByNameIgnoreCase("Коломна")).thenReturn(Optional.of(defaultCity));

        when(passwordEncoder.encode(anyString())).thenReturn("hashed_password");

        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            if (u.getId() == null) u.setId(idSeq.incrementAndGet());
            if (u.getUserRoles() == null) u.setUserRoles(new HashSet<>());
            return u;
        });

        when(userRoleRepository.save(any(UserRole.class))).thenAnswer(inv -> {
            UserRole ur = inv.getArgument(0);
            if (ur.getId() == null) ur.setId(idSeq.incrementAndGet());
            return ur;
        });

        when(roleRepository.findByName(RoleName.ROLE_RESIDENT)).thenReturn(Optional.of(residentRole));
        when(roleRepository.findByName(RoleName.ROLE_ORGANIZER)).thenReturn(Optional.of(organizerRole));

        when(jwtService.generateToken(anyString())).thenReturn("jwt-token");
    }

    // ─── register ─────────────────────────────────────────────────────────────

    // Обычная регистрация жителя: пользователь сохраняется, запрос на верификацию email отправляется,
    // ответ содержит email и флаг emailVerificationRequired=true.
    @Test
    void register_residentHappyPath() {
        when(userRepository.existsByLogin("alice")).thenReturn(false);
        when(userRepository.existsByEmail("alice@example.com")).thenReturn(false);
        when(userRepository.existsByPendingEmail("alice@example.com")).thenReturn(false);

        RegisterRequest req = new RegisterRequest();
        req.setLogin("alice");
        req.setEmail("alice@example.com");
        req.setPassword("Secret123");
        req.setRole("RESIDENT");

        RegisterResponse resp = authService.register(req);

        assertThat(resp.getEmail()).isEqualTo("alice@example.com");
        assertThat(resp.isEmailVerificationRequired()).isTrue();
        verify(userRepository).save(any(User.class));
        verify(emailVerificationService).sendRegistrationVerification(any(User.class));
    }

    // Логин уже занят → BadRequestException до вызова save().
    // Проверяем через verify(never()), что запись в БД не создалась.
    @Test
    void register_duplicateLoginThrows() {
        when(userRepository.existsByLogin("alice")).thenReturn(true);

        RegisterRequest req = new RegisterRequest();
        req.setLogin("alice");
        req.setEmail("new@example.com");
        req.setPassword("Secret123");

        assertThatThrownBy(() -> authService.register(req))
            .isInstanceOf(BadRequestException.class)
            .hasMessageContaining("Логин уже занят");
        verify(userRepository, never()).save(any());
    }

    // Email уже зарегистрирован → BadRequestException с понятным сообщением.
    @Test
    void register_duplicateEmailThrows() {
        when(userRepository.existsByLogin("bob")).thenReturn(false);
        when(userRepository.existsByEmail("dup@example.com")).thenReturn(true);

        RegisterRequest req = new RegisterRequest();
        req.setLogin("bob");
        req.setEmail("dup@example.com");
        req.setPassword("Secret123");

        assertThatThrownBy(() -> authService.register(req))
            .isInstanceOf(BadRequestException.class)
            .hasMessageContaining("Электронная почта уже используется");
    }

    // Email ожидает подтверждения у другого пользователя (pendingEmail) — тоже конфликт.
    @Test
    void register_pendingEmailThrows() {
        when(userRepository.existsByLogin("charlie")).thenReturn(false);
        when(userRepository.existsByEmail("c@example.com")).thenReturn(false);
        when(userRepository.existsByPendingEmail("c@example.com")).thenReturn(true);

        RegisterRequest req = new RegisterRequest();
        req.setLogin("charlie");
        req.setEmail("c@example.com");
        req.setPassword("Secret123");

        assertThatThrownBy(() -> authService.register(req))
            .isInstanceOf(BadRequestException.class)
            .hasMessageContaining("ожидает подтверждения");
    }

    // Телефон уже зарегистрирован → BadRequestException с упоминанием «телефон».
    @Test
    void register_duplicatePhoneThrows() {
        when(userRepository.existsByLogin("dave")).thenReturn(false);
        when(userRepository.existsByEmail("d@example.com")).thenReturn(false);
        when(userRepository.existsByPendingEmail("d@example.com")).thenReturn(false);
        when(userRepository.existsByPhone("+79991234567")).thenReturn(true);

        RegisterRequest req = new RegisterRequest();
        req.setLogin("dave");
        req.setEmail("d@example.com");
        req.setPhone("+79991234567");
        req.setPassword("Secret123");

        assertThatThrownBy(() -> authService.register(req))
            .isInstanceOf(BadRequestException.class)
            .hasMessageContaining("телефон");
    }

    // Организатор с новой компанией: сервис должен создать Organization + OrganizationMember.
    // Используем findByNameIgnoreCase → empty, чтобы имитировать отсутствие такой компании.
    @Test
    void register_organizerWithNewCompanyCreatesOrganization() {
        when(userRepository.existsByLogin("org1")).thenReturn(false);
        when(userRepository.existsByEmail("org1@example.com")).thenReturn(false);
        when(userRepository.existsByPendingEmail("org1@example.com")).thenReturn(false);
        when(organizationRepository.findByNameIgnoreCase("My Company")).thenReturn(Optional.empty());
        when(organizationRepository.save(any(Organization.class))).thenAnswer(inv -> {
            Organization o = inv.getArgument(0);
            o.setId(idSeq.incrementAndGet());
            return o;
        });
        when(organizationMemberRepository.save(any(OrganizationMember.class))).thenAnswer(inv -> inv.getArgument(0));

        RegisterRequest req = new RegisterRequest();
        req.setLogin("org1");
        req.setEmail("org1@example.com");
        req.setPassword("Secret123");
        req.setRole("ORGANIZER");
        req.setCompanyName("My Company");

        authService.register(req);

        verify(organizationRepository).save(any(Organization.class));
        verify(organizationMemberRepository).save(any(OrganizationMember.class));
    }

    // Организатор присоединяется к уже существующей организации по ID:
    // вместо создания Organization должна создаться OrganizationJoinRequest (заявка на вступление).
    // verify(never()) гарантирует, что организатора не добавляют сразу в члены.
    @Test
    void register_organizerJoiningExistingOrgCreatesJoinRequest() {
        when(userRepository.existsByLogin("org2")).thenReturn(false);
        when(userRepository.existsByEmail("org2@example.com")).thenReturn(false);
        when(userRepository.existsByPendingEmail("org2@example.com")).thenReturn(false);
        Organization existing = Organization.builder().id(50L).name("ExistOrg").city(defaultCity).build();
        when(organizationRepository.findByIdAndDeletedAtIsNull(50L)).thenReturn(Optional.of(existing));
        when(organizationJoinRequestRepository.save(any(OrganizationJoinRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        RegisterRequest req = new RegisterRequest();
        req.setLogin("org2");
        req.setEmail("org2@example.com");
        req.setPassword("Secret123");
        req.setRole("ORGANIZER");
        req.setOrganizationId(50L);

        authService.register(req);

        verify(organizationJoinRequestRepository).save(any(OrganizationJoinRequest.class));
        verify(organizationMemberRepository, never()).save(any());
    }

    // Самостоятельная регистрация с ролью ADMIN запрещена.
    @Test
    void register_adminRoleThrows() {
        when(userRepository.existsByLogin("hacker")).thenReturn(false);
        when(userRepository.existsByEmail("h@example.com")).thenReturn(false);
        when(userRepository.existsByPendingEmail("h@example.com")).thenReturn(false);

        RegisterRequest req = new RegisterRequest();
        req.setLogin("hacker");
        req.setEmail("h@example.com");
        req.setPassword("Secret123");
        req.setRole("ADMIN");

        assertThatThrownBy(() -> authService.register(req))
            .isInstanceOf(BadRequestException.class)
            .hasMessageContaining("администратора");
    }

    // Пробельный логин не должен проходить валидацию сервиса.
    @Test
    void register_emptyLoginThrows() {
        RegisterRequest req = new RegisterRequest();
        req.setLogin("  ");
        req.setEmail("x@example.com");
        req.setPassword("Secret123");

        assertThatThrownBy(() -> authService.register(req))
            .isInstanceOf(BadRequestException.class)
            .hasMessageContaining("логин");
    }

    // ─── login ────────────────────────────────────────────────────────────────

    // Успешный вход: мокируем совпадение пароля, проверяем наличие токена и логин в ответе.
    // Также проверяем, что lastLoginAt обновляется через save(user).
    @Test
    void login_happyPath() {
        User user = buildActiveVerifiedUser(200L, "alice", "alice@example.com", "hashed_pw");
        when(userRepository.findByLoginOrEmailWithRoles("alice")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Secret123", "hashed_pw")).thenReturn(true);

        LoginRequest req = new LoginRequest();
        req.setLoginOrEmail("alice");
        req.setPassword("Secret123");

        AuthResponse resp = authService.login(req);

        assertThat(resp.getToken()).isEqualTo("jwt-token");
        assertThat(resp.getUser().getLogin()).isEqualTo("alice");
        verify(userRepository).save(user);
        verify(loginAttemptService).recordSuccess("alice");
    }

    // Несуществующий пользователь → UnauthorizedException (не 404, чтобы не раскрывать существование аккаунта).
    @Test
    void login_userNotFoundThrows() {
        when(userRepository.findByLoginOrEmailWithRoles("ghost")).thenReturn(Optional.empty());

        LoginRequest req = new LoginRequest();
        req.setLoginOrEmail("ghost");
        req.setPassword("any");

        assertThatThrownBy(() -> authService.login(req))
            .isInstanceOf(UnauthorizedException.class);
        verify(loginAttemptService).recordFailure("ghost");
    }

    // Заблокированный пользователь (active=false) не может войти.
    // Сообщение должно содержать «заблокирована».
    @Test
    void login_inactiveUserThrows() {
        User user = buildActiveVerifiedUser(201L, "inactive", "i@example.com", "hash");
        user.setActive(false);
        when(userRepository.findByLoginOrEmailWithRoles("inactive")).thenReturn(Optional.of(user));

        LoginRequest req = new LoginRequest();
        req.setLoginOrEmail("inactive");
        req.setPassword("pass");

        assertThatThrownBy(() -> authService.login(req))
            .isInstanceOf(UnauthorizedException.class)
            .hasMessageContaining("заблокирована");
    }

    // Неверный пароль → UnauthorizedException. Сообщение «Неверный» не раскрывает,
    // что именно неверно (пользователь или пароль), что защищает от перебора.
    @Test
    void login_wrongPasswordThrows() {
        User user = buildActiveVerifiedUser(202L, "bob", "b@example.com", "hashed_pw");
        when(userRepository.findByLoginOrEmailWithRoles("bob")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong", "hashed_pw")).thenReturn(false);

        LoginRequest req = new LoginRequest();
        req.setLoginOrEmail("bob");
        req.setPassword("wrong");

        assertThatThrownBy(() -> authService.login(req))
            .isInstanceOf(UnauthorizedException.class)
            .hasMessageContaining("Неверный");
        verify(loginAttemptService).recordFailure("bob");
    }

    // После превышения лимита попыток LoginAttemptService блокирует вход ещё до проверки пароля.
    @Test
    void login_tooManyAttemptsThrowsBeforeLookup() {
        when(userRepository.findByLoginOrEmailWithRoles("alice")).thenReturn(Optional.empty());
        org.mockito.Mockito.doThrow(new UnauthorizedException("Слишком много попыток входа. Повторите позже."))
            .when(loginAttemptService).assertAllowed("alice");

        LoginRequest req = new LoginRequest();
        req.setLoginOrEmail("alice");
        req.setPassword("Secret123");

        assertThatThrownBy(() -> authService.login(req))
            .isInstanceOf(UnauthorizedException.class)
            .hasMessageContaining("Слишком много попыток");
        verify(userRepository, never()).findByLoginOrEmailWithRoles(anyString());
    }

    // Пользователь с неподтверждённым email: пароль верный, но вход запрещён.
    // Сервис повторно отправляет верификационное письмо (проверяем через verify).
    @Test
    void login_unverifiedEmailSendsVerificationAndThrows() {
        User user = buildActiveVerifiedUser(203L, "unverified", "u@example.com", "hashed_pw");
        user.setEmailVerified(false);
        when(userRepository.findByLoginOrEmailWithRoles("unverified")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("pass", "hashed_pw")).thenReturn(true);

        LoginRequest req = new LoginRequest();
        req.setLoginOrEmail("unverified");
        req.setPassword("pass");

        assertThatThrownBy(() -> authService.login(req))
            .isInstanceOf(UnauthorizedException.class)
            .hasMessageContaining("Подтвердите");
        verify(emailVerificationService).sendRegistrationVerification(user);
    }

    // ─── toCurrentUserResponse ────────────────────────────────────────────────

    // Роль «Администратор» в БД должна отображаться как «ADMIN» в API-ответе.
    @Test
    void toCurrentUserResponse_includesRoles() {
        User user = buildActiveVerifiedUser(300L, "admin", "a@example.com", "hash");
        Role adminRole = Role.builder().id(3L).name("Администратор").build();
        UserRole adminUserRole = UserRole.builder().id(10L).user(user).role(adminRole).assignedAt(OffsetDateTime.now()).build();
        user.setUserRoles(Set.of(adminUserRole));
        when(organizationMemberRepository.findAllByUserIdAndLeftAtIsNull(user.getId())).thenReturn(List.of());

        var resp = authService.toCurrentUserResponse(user);

        assertThat(resp.getRoles()).contains("ADMIN");
    }

    // Если пользователь является владельцем организации, ответ должен содержать блок organization.
    @Test
    void toCurrentUserResponse_includesPrimaryOrganizationAsOwner() {
        User user = buildActiveVerifiedUser(301L, "owner", "o@example.com", "hash");
        Organization org = Organization.builder().id(10L).name("Test Org").city(defaultCity).build();
        OrganizationMember member = OrganizationMember.builder()
            .id(1L).user(user).organization(org).organizationStatus("владелец")
            .joinedAt(OffsetDateTime.now()).build();
        when(organizationMemberRepository.findAllByUserIdAndLeftAtIsNull(user.getId())).thenReturn(List.of(member));

        var resp = authService.toCurrentUserResponse(user);

        assertThat(resp.getOrganization()).isNotNull();
        assertThat(resp.getOrganization().getName()).isEqualTo("Test Org");
    }

    // Пользователь без членства в организации → organization=null (не NPE, не пустой объект).
    @Test
    void toCurrentUserResponse_noOrganizationWhenNoMembership() {
        User user = buildActiveVerifiedUser(302L, "lone", "lone@example.com", "hash");
        when(organizationMemberRepository.findAllByUserIdAndLeftAtIsNull(user.getId())).thenReturn(List.of());

        var resp = authService.toCurrentUserResponse(user);

        assertThat(resp.getOrganization()).isNull();
    }

    // ─── helpers ──────────────────────────────────────────────────────────────

    // Строит активного, верифицированного пользователя с ролью RESIDENT.
    // Используется в login-тестах, чтобы не дублировать код построения User.
    private User buildActiveVerifiedUser(Long id, String login, String email, String passwordHash) {
        Role role = Role.builder().id(1L).name("Житель").build();
        User user = User.builder()
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
        UserRole ur = UserRole.builder().id(id + 1000).user(user).role(role).assignedAt(OffsetDateTime.now()).build();
        user.setUserRoles(new HashSet<>(Set.of(ur)));
        return user;
    }
}
