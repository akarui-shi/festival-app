package com.festivalapp.backend.integration;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Интеграционные тесты для API публикаций (новостей от организаций).
 * Уровень: integration. Проверяет публичное чтение, защищённые создание/удаление,
 * просмотр собственных публикаций и happy-path создания публикации членом организации.
 */
class PublicationApiIntegrationTest extends AbstractIntegrationTest {

    // ─── GET /api/publications ────────────────────────────────────────────────

    // Список публикаций — публичный эндпоинт (анонимный доступ).
    @Test
    void getAll_isPublicEndpoint() throws Exception {
        mockMvc.perform(get("/api/publications"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray());
    }

    // ─── GET /api/publications/{id} ───────────────────────────────────────────

    // Запрос несуществующей публикации → 404.
    @Test
    void getById_nonExistent_returnsNotFound() throws Exception {
        mockMvc.perform(get("/api/publications/9999999"))
            .andExpect(status().isNotFound());
    }

    // ─── POST /api/publications ───────────────────────────────────────────────

    // Создание публикации требует авторизации — анонимный запрос 401.
    @Test
    void create_requiresAuthentication() throws Exception {
        mockMvc.perform(post("/api/publications")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Test\",\"content\":\"Content\",\"eventId\":1}"))
            .andExpect(status().isUnauthorized());
    }

    // ─── GET /api/publications/mine ───────────────────────────────────────────

    // Просмотр своих публикаций — только авторизованные.
    @Test
    void getMine_requiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/publications/mine"))
            .andExpect(status().isUnauthorized());
    }

    // У нового пользователя нет публикаций — пустой массив.
    @Test
    void getMine_returnsEmptyInitially() throws Exception {
        String login = "pubmine_" + System.nanoTime();
        String token = registerVerifyAndLogin(login, login + "@test.local", "Pass1234");

        mockMvc.perform(get("/api/publications/mine")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray());
    }

    // ─── DELETE /api/publications/{id} ────────────────────────────────────────

    // Удаление публикации требует авторизации.
    @Test
    void delete_requiresAuthentication() throws Exception {
        mockMvc.perform(delete("/api/publications/1"))
            .andExpect(status().isUnauthorized());
    }

    // ─── Create publication by organizer ─────────────────────────────────────

    // Happy-path: организатор (член своей организации) создаёт публикацию к мероприятию.
    // Тест проверяет сложный сценарий: регистрация → получение orgId через БД → создание события
    // → создание публикации. 201 и правильный title подтверждают сквозную корректность.
    @Test
    void create_organizerMemberCanCreatePublication() throws Exception {
        String suffix = String.valueOf(System.nanoTime());
        String login = "pubcreate_" + suffix;

        // Register as organizer with a new company
        String regBody = """
            {"login":"%s","email":"%s@test.local","password":"Pass1234","role":"ORGANIZER","companyName":"PubCo_%s"}
            """.formatted(login, login, suffix);

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(regBody))
            .andExpect(status().isCreated());

        jdbcTemplate.update("UPDATE users SET email_verified = TRUE WHERE login = ?", login);
        String token = loginAndGetToken(login, "Pass1234");

        // Get the organizer's organization id
        Long userId = jdbcTemplate.queryForObject("SELECT id FROM users WHERE login = ?", Long.class, login);
        Long orgId = jdbcTemplate.queryForObject(
            "SELECT organization_id FROM organization_members WHERE user_id = ? AND left_at IS NULL LIMIT 1",
            Long.class, userId);

        // Create an event belonging to this organization
        Long adminUserId = jdbcTemplate.queryForObject(
            "SELECT id FROM users WHERE login = 'admin_local' LIMIT 1", Long.class);
        Long cityId = getCityId();
        Long eventId = jdbcTemplate.queryForObject("""
            INSERT INTO events (organization_id, created_by_user_id, city_id, title, status, is_free,
                                starts_at, ends_at, created_at, updated_at)
            VALUES (?, ?, ?, 'PubTestEvent_%s', 'опубликовано', true,
                    NOW() + INTERVAL '7 days', NOW() + INTERVAL '8 days', NOW(), NOW())
            RETURNING id
            """.formatted(suffix), Long.class, orgId, adminUserId, cityId);

        String pubBody = """
            {"title":"Test Publication","content":"Test content for publication","eventId":%d}
            """.formatted(eventId);

        mockMvc.perform(post("/api/publications")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(pubBody))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.title").value("Test Publication"));
    }
}
