package com.festivalapp.backend.integration;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Интеграционные тесты для API избранного (закладок мероприятий).
 * Уровень: integration. Проверяет добавление/удаление мероприятий в избранное,
 * просмотр своего списка и защиту эндпоинтов (все операции требуют авторизации).
 */
class FavoriteApiIntegrationTest extends AbstractIntegrationTest {

    private String token;
    private Long eventId;

    // Регистрируем уникального пользователя (nanoTime в имени) и создаём опубликованное мероприятие.
    @BeforeEach
    void setUpUser() throws Exception {
        token = registerVerifyAndLogin(
            "favuser_" + System.nanoTime(),
            "favuser_" + System.nanoTime() + "@test.local",
            "Pass1234"
        );
        eventId = createPublishedEvent();
    }

    // ─── POST /api/favorites ──────────────────────────────────────────────────

    // Добавление в избранное — только для авторизованных пользователей.
    @Test
    void createFavorite_requiresAuthentication() throws Exception {
        mockMvc.perform(post("/api/favorites")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"eventId\":" + eventId + "}"))
            .andExpect(status().isUnauthorized());
    }

    // Happy-path: 201 + в ответе eventId подтверждает, что именно это мероприятие добавлено.
    @Test
    void createFavorite_addsEventToFavorites() throws Exception {
        mockMvc.perform(post("/api/favorites")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"eventId\":" + eventId + "}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.eventId").value(eventId));
    }

    // Повторное добавление того же мероприятия — 400 с понятным сообщением.
    // Дубликат в избранном не допускается по бизнес-логике.
    @Test
    void createFavorite_duplicateReturnsBadRequest() throws Exception {
        String body = "{\"eventId\":" + eventId + "}";

        mockMvc.perform(post("/api/favorites")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isCreated());

        mockMvc.perform(post("/api/favorites")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("Мероприятие уже в избранном"));
    }

    // Отсутствие обязательного поля eventId → 400 с деталями в $.details.eventId.
    @Test
    void createFavorite_missingEventIdReturnsValidationError() throws Exception {
        mockMvc.perform(post("/api/favorites")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.details.eventId").exists());
    }

    // ─── GET /api/favorites/my ────────────────────────────────────────────────

    // Получение своего списка избранного — только для авторизованных.
    @Test
    void getMyFavorites_requiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/favorites/my"))
            .andExpect(status().isUnauthorized());
    }

    // У нового пользователя список избранного пустой.
    @Test
    void getMyFavorites_returnsEmptyListInitially() throws Exception {
        mockMvc.perform(get("/api/favorites/my")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray())
            .andExpect(jsonPath("$", hasSize(0)));
    }

    // После добавления мероприятие должно появиться в списке с правильным eventId.
    @Test
    void getMyFavorites_returnsAddedFavorite() throws Exception {
        mockMvc.perform(post("/api/favorites")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"eventId\":" + eventId + "}"))
            .andExpect(status().isCreated());

        mockMvc.perform(get("/api/favorites/my")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(1)))
            .andExpect(jsonPath("$[0].eventId").value(eventId));
    }

    // ─── DELETE /api/favorites/{eventId} ─────────────────────────────────────

    // Удаление из избранного — только для авторизованных.
    @Test
    void deleteFavorite_requiresAuthentication() throws Exception {
        mockMvc.perform(delete("/api/favorites/" + eventId))
            .andExpect(status().isUnauthorized());
    }

    // После удаления список избранного снова пуст: проверяем тремя запросами.
    @Test
    void deleteFavorite_removesFromFavorites() throws Exception {
        mockMvc.perform(post("/api/favorites")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"eventId\":" + eventId + "}"))
            .andExpect(status().isCreated());

        mockMvc.perform(delete("/api/favorites/" + eventId)
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));

        mockMvc.perform(get("/api/favorites/my")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(0)));
    }

    // Попытка удалить мероприятие, которого нет в избранном → 404.
    @Test
    void deleteFavorite_notInFavoritesReturnsNotFound() throws Exception {
        mockMvc.perform(delete("/api/favorites/999999")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isNotFound());
    }

    // ─── helpers ──────────────────────────────────────────────────────────────

    // Делегирует в базовый createPublishedEvent с фиксированным заголовком.
    private Long createPublishedEvent() {
        return createPublishedEvent("Тестовое мероприятие");
    }
}
