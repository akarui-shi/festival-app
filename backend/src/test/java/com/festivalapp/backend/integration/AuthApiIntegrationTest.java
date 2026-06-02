package com.festivalapp.backend.integration;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Интеграционные тесты для API аутентификации: регистрация и вход.
 * Уровень: integration. Проверяет бизнес-правила регистрации (уникальность логина/email,
 * валидация полей, запрет роли ADMIN) и правила входа (верификация email, неверный пароль).
 */
class AuthApiIntegrationTest extends AbstractIntegrationTest {

    // ─── POST /api/auth/register ──────────────────────────────────────────────

    // Базовый happy-path регистрации жителя: ответ 201 с email пользователя
    // и флагом emailVerificationRequired=true (после регистрации нужно подтвердить почту).
    @Test
    void register_residentCreatesUser() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "login": "newresident",
                        "email": "newresident@test.local",
                        "password": "Secret123",
                        "role": "RESIDENT"
                    }
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.email").value("newresident@test.local"))
            .andExpect(jsonPath("$.emailVerificationRequired").value(true));
    }

    // Второй запрос с тем же login но другим email должен вернуть 400:
    // бизнес-правило — логин уникален в системе. Проверяем и статус, и текст ошибки в $.message.
    @Test
    void register_duplicateLoginReturnsBadRequest() throws Exception {
        String body = """
            {"login":"dupuser","email":"dup1@test.local","password":"Secret123","role":"RESIDENT"}
            """;
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated());

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"login":"dupuser","email":"dup2@test.local","password":"Secret123","role":"RESIDENT"}
                    """))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message", containsString("Логин уже занят")));
    }

    // Email тоже уникален: одна почта не может принадлежать двум аккаунтам.
    // Проверяем, что $.message содержит слово «почта» — это конкретная бизнес-ошибка.
    @Test
    void register_duplicateEmailReturnsBadRequest() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"login":"emaildup1","email":"shared@test.local","password":"Secret123","role":"RESIDENT"}
                    """))
            .andExpect(status().isCreated());

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"login":"emaildup2","email":"shared@test.local","password":"Secret123","role":"RESIDENT"}
                    """))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message", containsString("почта")));
    }

    // Отсутствие обязательного поля login должно вернуть 400 с деталями в $.details.login —
    // это стандартная структура ошибок Bean Validation в проекте.
    @Test
    void register_missingLoginReturnsValidationError() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email":"noname@test.local","password":"Secret123"}
                    """))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.details.login").exists());
    }

    // Аналогично для отсутствующего email — детали ошибки в $.details.email.
    @Test
    void register_missingEmailReturnsValidationError() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"login":"noemail","password":"Secret123"}
                    """))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.details.email").exists());
    }

    // Некорректный формат email («not-an-email» без @) должен провалить @Email-валидацию.
    // Ожидаем ошибку именно в поле email, а не общую.
    @Test
    void register_invalidEmailFormatReturnsValidationError() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"login":"bademail","email":"not-an-email","password":"Secret123"}
                    """))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.details.email").exists());
    }

    // Слишком короткий пароль («123») должен не пройти @Size-валидацию.
    // Ожидаем ошибку в поле password.
    @Test
    void register_shortPasswordReturnsValidationError() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"login":"shortpw","email":"shortpw@test.local","password":"123"}
                    """))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.details.password").exists());
    }

    // Попытка самостоятельной регистрации с ролью ADMIN запрещена бизнес-правилом:
    // администраторов создаёт только другой администратор через отдельный интерфейс.
    // Ошибка должна упоминать «администратора».
    @Test
    void register_adminRoleReturnsBadRequest() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"login":"hacker","email":"hacker@test.local","password":"Secret123","role":"ADMIN"}
                    """))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message", containsString("администратора")));
    }

    // ─── POST /api/auth/login ─────────────────────────────────────────────────

    // admin_local создан миграцией V2 с email_verified=true и паролем 123456.
    // Проверяем: возвращается токен, в $.user.roles — массив (роль ADMIN).
    @Test
    void login_adminUserReturnsTokenAndRoles() throws Exception {
        // admin_local is seeded in V2 migration with email_verified=true, password=123456
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"loginOrEmail":"admin_local","password":"123456"}
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token", notNullValue()))
            .andExpect(jsonPath("$.user.login").value("admin_local"))
            .andExpect(jsonPath("$.user.roles").isArray());
    }

    // После registerAndVerify пользователь должен успешно войти.
    // Проверяем $.user.emailVerified=true — гарантия, что верификация прошла.
    @Test
    void login_verifiedResidentReturnsToken() throws Exception {
        registerAndVerify("logintest", "logintest@test.local", "Pass1234");

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"loginOrEmail":"logintest","password":"Pass1234"}
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token", notNullValue()))
            .andExpect(jsonPath("$.user.login").value("logintest"))
            .andExpect(jsonPath("$.user.emailVerified").value(true));
    }

    // Поле loginOrEmail принимает как логин, так и email — проверяем именно email-вход.
    // Это важно для UX: пользователь может не помнить логин.
    @Test
    void login_canUseEmailInsteadOfLogin() throws Exception {
        registerAndVerify("emaillogin", "emaillogin@test.local", "Pass1234");

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"loginOrEmail":"emaillogin@test.local","password":"Pass1234"}
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token", notNullValue()));
    }

    // Неверный пароль → 401 Unauthorized. 403 здесь неуместен: пользователь не идентифицирован.
    @Test
    void login_wrongPasswordReturnsUnauthorized() throws Exception {
        registerAndVerify("wrongpw", "wrongpw@test.local", "RealPass1");

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"loginOrEmail":"wrongpw","password":"WrongPass"}
                    """))
            .andExpect(status().isUnauthorized());
    }

    // Несуществующий пользователь → 401 (не 404, чтобы не раскрывать факт существования аккаунта).
    @Test
    void login_unknownUserReturnsUnauthorized() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"loginOrEmail":"nobody","password":"any"}
                    """))
            .andExpect(status().isUnauthorized());
    }

    // Зарегистрированный, но не верифицировавший email пользователь не может войти.
    // 401 + текст «Подтвердите» информирует пользователя о причине отказа.
    @Test
    void login_unverifiedEmailReturnsUnauthorized() throws Exception {
        // Register but do NOT verify email
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"login":"unverified","email":"unverified@test.local","password":"Pass1234","role":"RESIDENT"}
                    """))
            .andExpect(status().isCreated());

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"loginOrEmail":"unverified","password":"Pass1234"}
                    """))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.message", containsString("Подтвердите")));
    }

    // Пустое тело запроса {} должно провалить Bean Validation.
    // $.details — карта ошибок по полям; наличие карты подтверждает, что это validation error, а не 500.
    @Test
    void login_missingFieldsReturnsValidationError() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.details").isMap());
    }
}
