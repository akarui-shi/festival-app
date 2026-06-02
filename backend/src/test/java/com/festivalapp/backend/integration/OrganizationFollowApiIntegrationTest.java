package com.festivalapp.backend.integration;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Интеграционные тесты для API подписок на организации.
 * Уровень: integration. Проверяет подписку/отписку от организации и получение статуса подписки.
 * Мутирующие операции (follow/unfollow) требуют авторизации; статус можно смотреть анонимно.
 */
class OrganizationFollowApiIntegrationTest extends AbstractIntegrationTest {

    private Long orgId;

    // Убеждаемся, что организация есть в базе перед каждым тестом.
    @BeforeEach
    void setUp() {
        orgId = getOrCreateOrganizationId();
    }

    // ─── POST /api/organizations/{id}/follow ─────────────────────────────────

    // Подписка — только для авторизованных пользователей.
    @Test
    void follow_requiresAuthentication() throws Exception {
        mockMvc.perform(post("/api/organizations/" + orgId + "/follow"))
            .andExpect(status().isUnauthorized());
    }

    // После подписки ответ должен содержать $.following=true.
    // Это позволяет фронтенду сразу обновить кнопку без повторного запроса статуса.
    @Test
    void follow_addsFollower() throws Exception {
        String login = "follow_" + System.nanoTime();
        String token = registerVerifyAndLogin(login, login + "@test.local", "Pass1234");

        mockMvc.perform(post("/api/organizations/" + orgId + "/follow")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.following").value(true));
    }

    // ─── DELETE /api/organizations/{id}/follow ────────────────────────────────

    // Отписка — только для авторизованных пользователей.
    @Test
    void unfollow_requiresAuthentication() throws Exception {
        mockMvc.perform(delete("/api/organizations/" + orgId + "/follow"))
            .andExpect(status().isUnauthorized());
    }

    // Полный цикл: сначала подписываемся, потом отписываемся.
    // После отписки $.following=false — фронтенд получает актуальный флаг сразу.
    @Test
    void unfollow_removesFollower() throws Exception {
        String login = "unfollow_" + System.nanoTime();
        String token = registerVerifyAndLogin(login, login + "@test.local", "Pass1234");

        // First follow
        mockMvc.perform(post("/api/organizations/" + orgId + "/follow")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk());

        // Then unfollow
        mockMvc.perform(delete("/api/organizations/" + orgId + "/follow")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.following").value(false));
    }

    // ─── GET /api/organizations/{id}/follow/status ────────────────────────────

    // Статус подписки — публичный эндпоинт. Анонимный пользователь видит $.following=false
    // и $.followersCount (число). Используется для отображения счётчика на странице организации.
    @Test
    void status_isPublicEndpoint() throws Exception {
        mockMvc.perform(get("/api/organizations/" + orgId + "/follow/status"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.following").value(false))
            .andExpect(jsonPath("$.followersCount").isNumber());
    }

    // После подписки статус-эндпоинт должен вернуть $.following=true для авторизованного пользователя.
    @Test
    void status_afterFollow_returnsFollowing() throws Exception {
        String login = "statuschk_" + System.nanoTime();
        String token = registerVerifyAndLogin(login, login + "@test.local", "Pass1234");

        mockMvc.perform(post("/api/organizations/" + orgId + "/follow")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/organizations/" + orgId + "/follow/status")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.following").value(true));
    }
}
