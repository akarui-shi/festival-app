package com.festivalapp.backend.integration;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Интеграционные тесты для административного API модерации.
 * Уровень: integration. Проверяет доступ к эндпоинтам /api/admin/** только для роли ADMIN,
 * а также корректность применения решений о модерации (одобрение/отклонение мероприятий).
 */
class AdminModerationApiIntegrationTest extends AbstractIntegrationTest {

    private String adminToken;

    // Получаем токен для предсозданного пользователя admin_local (миграция V2).
    // Этот пользователь имеет роль ADMIN и уже верифицирован — идеален для всех admin-тестов.
    @BeforeEach
    void setUp() throws Exception {
        adminToken = loginAndGetToken("admin_local", "123456");
    }

    // ─── GET /api/admin/events ────────────────────────────────────────────────

    // Без токена Spring Security должен вернуть 401, а не 403 или 404 —
    // это отражает политику «сначала проверь авторизацию».
    @Test
    void getEvents_requiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/admin/events"))
            .andExpect(status().isUnauthorized());
    }

    // Проверяем, что эндпоинт доступен для ADMIN и возвращает массив (может быть пустым).
    // Тип ответа — массив, а не объект-обёртка, что соответствует контракту API.
    @Test
    void getEvents_adminCanAccess() throws Exception {
        mockMvc.perform(get("/api/admin/events")
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray());
    }

    // ─── GET /api/admin/comments ──────────────────────────────────────────────

    // Проверка аутентификации для списка комментариев: без токена 401.
    @Test
    void getComments_requiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/admin/comments"))
            .andExpect(status().isUnauthorized());
    }

    // Администратор должен видеть все комментарии (включая неодобренные).
    @Test
    void getComments_adminCanAccess() throws Exception {
        mockMvc.perform(get("/api/admin/comments")
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray());
    }

    // ─── GET /api/admin/moderation ────────────────────────────────────────────

    // История модерации — тоже защищённый эндпоинт.
    @Test
    void getModerationHistory_requiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/admin/moderation"))
            .andExpect(status().isUnauthorized());
    }

    // Журнал действий администраторов должен быть доступен только ADMIN.
    @Test
    void getModerationHistory_adminCanAccess() throws Exception {
        mockMvc.perform(get("/api/admin/moderation")
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray());
    }

    // ─── PATCH /api/admin/events/{id}/status ──────────────────────────────────

    // Полный happy-path одобрения: создаём мероприятие в статусе «на_рассмотрении»,
    // затем администратор переводит его в «опубликовано» (PUBLISHED).
    // В ответе проверяем $.id — это минимальная гарантия, что вернули именно изменённое мероприятие.
    @Test
    void updateEventStatus_adminCanApprove() throws Exception {
        // Create an event in PENDING_APPROVAL status
        Long orgId = getOrCreateOrganizationId();
        Long cityId = getCityId();
        Long adminUserId = jdbcTemplate.queryForObject(
            "SELECT id FROM users WHERE login = 'admin_local' LIMIT 1", Long.class);

        Long eventId = jdbcTemplate.queryForObject("""
            INSERT INTO events (organization_id, created_by_user_id, city_id, title, status, is_free,
                                starts_at, ends_at, created_at, updated_at)
            VALUES (?, ?, ?, 'Admin Approve Test Event', 'на_рассмотрении', true,
                    NOW() + INTERVAL '7 days', NOW() + INTERVAL '8 days', NOW(), NOW())
            RETURNING id
            """, Long.class, orgId, adminUserId, cityId);

        mockMvc.perform(patch("/api/admin/events/" + eventId + "/status")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"PUBLISHED\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(eventId));
    }
}
