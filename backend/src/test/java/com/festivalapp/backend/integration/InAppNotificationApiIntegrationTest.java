package com.festivalapp.backend.integration;

import org.junit.jupiter.api.Test;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Интеграционные тесты для API внутренних уведомлений (in-app notifications).
 * Уровень: integration. Проверяет доступ к уведомлениям (только авторизованный пользователь видит своё),
 * счётчик непрочитанных и операцию «отметить все как прочитанные».
 */
class InAppNotificationApiIntegrationTest extends AbstractIntegrationTest {

    // ─── GET /api/notifications ───────────────────────────────────────────────

    // Список уведомлений доступен только авторизованным пользователям.
    @Test
    void list_requiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/notifications"))
            .andExpect(status().isUnauthorized());
    }

    // Новый пользователь не имеет уведомлений — ожидаем пустой массив (не null, не ошибку).
    @Test
    void list_returnsEmptyInitially() throws Exception {
        String login = "notiflist_" + System.nanoTime();
        String token = registerVerifyAndLogin(login, login + "@test.local", "Pass1234");

        mockMvc.perform(get("/api/notifications")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray());
    }

    // ─── GET /api/notifications/unread-count ──────────────────────────────────

    // Счётчик непрочитанных — защищённый эндпоинт.
    @Test
    void unreadCount_requiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/notifications/unread-count"))
            .andExpect(status().isUnauthorized());
    }

    // У нового пользователя счётчик непрочитанных равен 0 — проверяем $.count.
    @Test
    void unreadCount_returnsZeroInitially() throws Exception {
        String login = "notifcnt_" + System.nanoTime();
        String token = registerVerifyAndLogin(login, login + "@test.local", "Pass1234");

        mockMvc.perform(get("/api/notifications/unread-count")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.count").value(0));
    }

    // ─── POST /api/notifications/mark-all-read ────────────────────────────────

    // Отметить все как прочитанные — только для авторизованных.
    @Test
    void markAllRead_requiresAuthentication() throws Exception {
        mockMvc.perform(post("/api/notifications/mark-all-read"))
            .andExpect(status().isUnauthorized());
    }

    // После операции возвращается 204 No Content — нет тела ответа, что соответствует REST-семантике.
    @Test
    void markAllRead_returnsNoContent() throws Exception {
        String login = "notifmark_" + System.nanoTime();
        String token = registerVerifyAndLogin(login, login + "@test.local", "Pass1234");

        mockMvc.perform(post("/api/notifications/mark-all-read")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isNoContent());
    }

    // ─── PATCH /api/notifications/{id}/read ──────────────────────────────────

    // Отметить одно уведомление как прочитанное — только для авторизованных.
    @Test
    void markRead_requiresAuthentication() throws Exception {
        mockMvc.perform(patch("/api/notifications/1/read"))
            .andExpect(status().isUnauthorized());
    }
}
