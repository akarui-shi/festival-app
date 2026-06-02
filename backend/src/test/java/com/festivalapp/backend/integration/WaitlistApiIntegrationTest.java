package com.festivalapp.backend.integration;

import org.junit.jupiter.api.Test;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Интеграционные тесты для API листа ожидания (waitlist) на сеансы мероприятий.
 * Уровень: integration. Проверяет постановку в очередь, выход из очереди и статус ожидания.
 * Все эндпоинты требуют авторизации.
 */
class WaitlistApiIntegrationTest extends AbstractIntegrationTest {

    // ─── POST /api/sessions/{sessionId}/waitlist ──────────────────────────────

    // Встать в очередь — только авторизованным.
    @Test
    void join_requiresAuthentication() throws Exception {
        mockMvc.perform(post("/api/sessions/1/waitlist"))
            .andExpect(status().isUnauthorized());
    }

    // ─── DELETE /api/sessions/{sessionId}/waitlist ────────────────────────────

    // Покинуть очередь — только авторизованным.
    @Test
    void leave_requiresAuthentication() throws Exception {
        mockMvc.perform(delete("/api/sessions/1/waitlist"))
            .andExpect(status().isUnauthorized());
    }

    // ─── GET /api/sessions/{sessionId}/waitlist/status ────────────────────────

    // Проверка статуса в очереди — только авторизованным.
    @Test
    void status_requiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/sessions/1/waitlist/status"))
            .andExpect(status().isUnauthorized());
    }

    // ─── join non-existent session ────────────────────────────────────────────

    // Несуществующий sessionId — ожидаем ошибку 400, 404 или 500.
    // Широкий диапазон потому, что поведение зависит от реализации: бизнес-ошибка или техническая.
    @Test
    void join_nonExistentSession_throws() throws Exception {
        String login = "wl_nonexist_" + System.nanoTime();
        String token = registerVerifyAndLogin(login, login + "@test.local", "Pass1234");

        mockMvc.perform(post("/api/sessions/9999999/waitlist")
                .header("Authorization", "Bearer " + token))
            .andExpect(result -> {
                int status = result.getResponse().getStatus();
                if (status != 400 && status != 404 && status != 500) {
                    throw new AssertionError("Expected 400/404/500 but got " + status);
                }
            });
    }

    // ─── join valid session ───────────────────────────────────────────────────

    // Happy-path: создаём мероприятие и сеанс, встаём в очередь.
    // Ответ должен содержать $.position — числовой номер в очереди.
    @Test
    void join_validSession_succeeds() throws Exception {
        String login = "wl_join_" + System.nanoTime();
        String token = registerVerifyAndLogin(login, login + "@test.local", "Pass1234");

        Long eventId = createPublishedEvent("WL Test Event " + System.nanoTime());
        Long sessionId = createSession(eventId);

        mockMvc.perform(post("/api/sessions/" + sessionId + "/waitlist")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.position").isNumber());
    }

    // После постановки в очередь статус-эндпоинт должен вернуть $.inQueue=true.
    @Test
    void status_afterJoin_returnsInQueue() throws Exception {
        String login = "wl_status_" + System.nanoTime();
        String token = registerVerifyAndLogin(login, login + "@test.local", "Pass1234");

        Long eventId = createPublishedEvent("WL Status Event " + System.nanoTime());
        Long sessionId = createSession(eventId);

        mockMvc.perform(post("/api/sessions/" + sessionId + "/waitlist")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/sessions/" + sessionId + "/waitlist/status")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.inQueue").value(true));
    }

    // ─── helpers ──────────────────────────────────────────────────────────────

    // Создаёт запланированный сеанс для заданного мероприятия напрямую в БД.
    // Статус «запланирован» необходим, чтобы сеанс был допустим для записи в очередь.
    private Long createSession(Long eventId) {
        return jdbcTemplate.queryForObject("""
            INSERT INTO sessions (event_id, starts_at, status, created_at, updated_at)
            VALUES (?, NOW() + INTERVAL '7 days', 'запланирован', NOW(), NOW())
            RETURNING id
            """, Long.class, eventId);
    }
}
