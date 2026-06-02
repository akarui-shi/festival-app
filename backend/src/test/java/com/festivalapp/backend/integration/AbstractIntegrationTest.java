package com.festivalapp.backend.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Базовый класс для всех интеграционных тестов.
 * Уровень: integration. Поднимает реальный Spring-контекст с PostgreSQL через Testcontainers,
 * мокирует JavaMailSender, чтобы письма не отправлялись в ходе тестов.
 * Каждый конкретный тест-класс наследует MockMvc, ObjectMapper, JdbcTemplate
 * и вспомогательные методы для регистрации/логина пользователей и создания тестовых данных.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class AbstractIntegrationTest {

    // Один контейнер на весь набор тестов: статическая инициализация гарантирует,
    // что PostgreSQL поднимается только один раз и разделяется между всеми классами.
    static final PostgreSQLContainer<?> POSTGRES;

    static {
        POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("festival_test")
            .withUsername("test")
            .withPassword("test");
        POSTGRES.start();
    }

    // Прокидываем JDBC-параметры контейнера в Spring-контекст динамически,
    // чтобы не хардкодить порт (он случаен при каждом запуске).
    @DynamicPropertySource
    static void postgresProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    // Мокируем почтовый сервис, чтобы тесты не требовали SMTP и не отправляли реальные письма.
    @MockBean
    JavaMailSender mailSender;

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected ObjectMapper objectMapper;

    @Autowired
    protected JdbcTemplate jdbcTemplate;

    /**
     * Возвращает ID существующей организации или создаёт минимальную, если таблица пуста.
     * Использует первый доступный city_id (заполняется миграцией Flyway V2).
     * Метод нужен, чтобы тесты могли работать с организацией, не заботясь о её предварительном создании.
     */
    protected Long getOrCreateOrganizationId() {
        Long existing = jdbcTemplate.query(
            "SELECT id FROM organizations LIMIT 1",
            rs -> rs.next() ? rs.getLong(1) : null);
        if (existing != null) return existing;

        Long cityId = jdbcTemplate.queryForObject(
            "SELECT id FROM cities ORDER BY id ASC LIMIT 1", Long.class);
        return jdbcTemplate.queryForObject(
            "INSERT INTO organizations (city_id, name, moderation_status, created_at, updated_at) " +
            "VALUES (?, 'Тестовая организация', 'одобрена', NOW(), NOW()) RETURNING id",
            Long.class, cityId);
    }

    /**
     * Возвращает ID первого города из БД (всегда доступен после выполнения миграции Flyway V2).
     * Используется как вспомогательный метод для создания мероприятий и организаций в тестах.
     */
    protected Long getCityId() {
        return jdbcTemplate.queryForObject(
            "SELECT id FROM cities ORDER BY id ASC LIMIT 1", Long.class);
    }

    /**
     * Создаёт опубликованное мероприятие с заданным заголовком и возвращает его ID.
     * Использует пользователя admin_local (заполняется миграцией V2) как автора.
     * Статус «опубликовано» позволяет тестировать публичные API без прохождения модерации.
     */
    protected Long createPublishedEvent(String title) {
        Long orgId = getOrCreateOrganizationId();
        Long cityId = getCityId();
        Long userId = jdbcTemplate.queryForObject(
            "SELECT id FROM users WHERE login = 'admin_local' LIMIT 1", Long.class);
        return jdbcTemplate.queryForObject("""
            INSERT INTO events (organization_id, created_by_user_id, city_id, title, status, is_free,
                                starts_at, ends_at, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'опубликовано', true,
                    NOW() + INTERVAL '7 days', NOW() + INTERVAL '8 days', NOW(), NOW())
            RETURNING id
            """, Long.class, orgId, userId, cityId, title);
    }

    /**
     * Регистрирует пользователя и сразу же верифицирует его email через прямое обновление в БД.
     * Обход email-верификации через SQL необходим, так как в тестах почта не отправляется (mailSender замокан).
     */
    protected void registerAndVerify(String login, String email, String password) throws Exception {
        String body = """
            {"login":"%s","email":"%s","password":"%s","role":"RESIDENT"}
            """.formatted(login, email, password);

        mockMvc.perform(post("/api/auth/register")
                .contentType(APPLICATION_JSON)
                .content(body))
            .andExpect(status().isCreated());

        jdbcTemplate.update("UPDATE users SET email_verified = TRUE WHERE login = ?", login);
    }

    /**
     * Выполняет вход по логину или email и извлекает JWT-токен из ответа.
     * Возвращённый токен используется в тестах как Bearer-заголовок для авторизованных запросов.
     */
    protected String loginAndGetToken(String loginOrEmail, String password) throws Exception {
        String body = """
            {"loginOrEmail":"%s","password":"%s"}
            """.formatted(loginOrEmail, password);

        String response = mockMvc.perform(post("/api/auth/login")
                .contentType(APPLICATION_JSON)
                .content(body))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();

        return objectMapper.readTree(response).path("token").asText();
    }

    /**
     * Комбинированный хелпер: регистрация + верификация email + вход за один шаг.
     * Возвращает JWT-токен. Удобен для setUp-методов, где нужен токен конкретного пользователя.
     */
    protected String registerVerifyAndLogin(String login, String email, String password) throws Exception {
        registerAndVerify(login, email, password);
        return loginAndGetToken(login, password);
    }
}
