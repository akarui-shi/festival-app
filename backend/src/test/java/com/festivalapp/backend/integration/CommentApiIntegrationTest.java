package com.festivalapp.backend.integration;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Интеграционные тесты для API комментариев к мероприятиям.
 * Уровень: integration. Проверяет CRUD-операции над комментариями:
 * публичное чтение, защищённое создание/редактирование/удаление,
 * права доступа (только автор или администратор могут редактировать/удалять),
 * а также валидацию полей (текст, рейтинг 1–5, обрезка пробелов).
 */
class CommentApiIntegrationTest extends AbstractIntegrationTest {

    private String residentToken;
    private String adminToken;
    private Long eventId;

    // nanoTime в логине гарантирует уникальность между тестами в рамках одного запуска.
    // Создаём опубликованное мероприятие, чтобы на него можно было оставлять комментарии.
    @BeforeEach
    void setUp() throws Exception {
        residentToken = registerVerifyAndLogin(
            "commentuser_" + System.nanoTime(),
            "commentuser_" + System.nanoTime() + "@test.local",
            "Pass1234"
        );
        adminToken = loginAndGetToken("admin_local", "123456");
        eventId = createPublishedEvent();
    }

    // ─── GET /api/comments/event/{eventId} ────────────────────────────────────

    // Просмотр комментариев — публичный эндпоинт: анонимный пользователь может читать.
    @Test
    void getCommentsByEvent_isPublicEndpoint() throws Exception {
        mockMvc.perform(get("/api/comments/event/" + eventId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray());
    }

    // У нового мероприятия комментариев нет — массив должен быть пустым.
    @Test
    void getCommentsByEvent_returnsEmptyInitially() throws Exception {
        mockMvc.perform(get("/api/comments/event/" + eventId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(0)));
    }

    // После добавления комментария он должен появиться в списке с правильными text и rating.
    @Test
    void getCommentsByEvent_returnsPostedComments() throws Exception {
        postComment(residentToken, eventId, "Отличное мероприятие!", 5);

        mockMvc.perform(get("/api/comments/event/" + eventId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(1)))
            .andExpect(jsonPath("$[0].text").value("Отличное мероприятие!"))
            .andExpect(jsonPath("$[0].rating").value(5));
    }

    // ─── POST /api/comments ───────────────────────────────────────────────────

    // Оставить комментарий можно только авторизованным пользователям.
    @Test
    void createComment_requiresAuthentication() throws Exception {
        mockMvc.perform(post("/api/comments")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"eventId\":" + eventId + ",\"text\":\"Test\",\"rating\":5}"))
            .andExpect(status().isUnauthorized());
    }

    // Happy-path создания комментария: 201 + в ответе text, rating и commentId.
    // commentId нужен для последующих запросов редактирования/удаления.
    @Test
    void createComment_residentCanPost() throws Exception {
        mockMvc.perform(post("/api/comments")
                .header("Authorization", "Bearer " + residentToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"eventId\":" + eventId + ",\"text\":\"Хорошее событие\",\"rating\":4}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.text").value("Хорошее событие"))
            .andExpect(jsonPath("$.rating").value(4))
            .andExpect(jsonPath("$.commentId").exists());
    }

    // Сервис должен обрезать пробелы вокруг текста — проверяем, что «  Интересно  » сохраняется как «Интересно».
    @Test
    void createComment_trimsSurroundingWhitespace() throws Exception {
        mockMvc.perform(post("/api/comments")
                .header("Authorization", "Bearer " + residentToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"eventId\":" + eventId + ",\"text\":\"  Интересно  \",\"rating\":3}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.text").value("Интересно"));
    }

    // Текст обязателен — его отсутствие должно вернуть 400.
    @Test
    void createComment_missingTextReturnsValidationError() throws Exception {
        mockMvc.perform(post("/api/comments")
                .header("Authorization", "Bearer " + residentToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"eventId\":" + eventId + ",\"rating\":5}"))
            .andExpect(status().isBadRequest());
    }

    // Рейтинг должен быть от 1 до 5. Значение 6 должно вернуть 400 с деталями в $.details.rating.
    @Test
    void createComment_ratingAbove5ReturnsValidationError() throws Exception {
        mockMvc.perform(post("/api/comments")
                .header("Authorization", "Bearer " + residentToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"eventId\":" + eventId + ",\"text\":\"OK\",\"rating\":6}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.details.rating").exists());
    }

    // Рейтинг 0 тоже ниже минимума (1): проверяем нижнюю границу.
    @Test
    void createComment_ratingBelowOneReturnsValidationError() throws Exception {
        mockMvc.perform(post("/api/comments")
                .header("Authorization", "Bearer " + residentToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"eventId\":" + eventId + ",\"text\":\"OK\",\"rating\":0}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.details.rating").exists());
    }

    // ─── PUT /api/comments/{id} ───────────────────────────────────────────────

    // Автор комментария может изменить текст и рейтинг.
    // Проверяем, что возвращается обновлённая версия.
    @Test
    void updateComment_ownerCanEdit() throws Exception {
        Long commentId = postComment(residentToken, eventId, "Старый текст", 3);

        mockMvc.perform(put("/api/comments/" + commentId)
                .header("Authorization", "Bearer " + residentToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"text\":\"Новый текст\",\"rating\":5}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.text").value("Новый текст"))
            .andExpect(jsonPath("$.rating").value(5));
    }

    // Администратор имеет полномочия редактировать любые комментарии (модерация).
    @Test
    void updateComment_adminCanEditAny() throws Exception {
        Long commentId = postComment(residentToken, eventId, "Спорный комментарий", 1);

        mockMvc.perform(put("/api/comments/" + commentId)
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"text\":\"Исправлено администратором\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.text").value("Исправлено администратором"));
    }

    // Редактирование без токена — 401.
    @Test
    void updateComment_requiresAuthentication() throws Exception {
        Long commentId = postComment(residentToken, eventId, "Текст", 5);

        mockMvc.perform(put("/api/comments/" + commentId)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"text\":\"New\"}"))
            .andExpect(status().isUnauthorized());
    }

    // Другой пользователь (не владелец и не admin) пытается изменить чужой комментарий — 400.
    // 400 вместо 403 — потому что это бизнес-ошибка, а не ошибка авторизации Spring Security.
    @Test
    void updateComment_foreignUserReturnsBadRequest() throws Exception {
        Long commentId = postComment(residentToken, eventId, "Мой комментарий", 5);

        String otherToken = registerVerifyAndLogin(
            "other_" + System.nanoTime(),
            "other_" + System.nanoTime() + "@test.local",
            "Pass1234"
        );

        mockMvc.perform(put("/api/comments/" + commentId)
                .header("Authorization", "Bearer " + otherToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"text\":\"Чужое\"}"))
            .andExpect(status().isBadRequest());
    }

    // ─── DELETE /api/comments/{id} ────────────────────────────────────────────

    // После удаления комментарий исчезает из списка: проверяем двумя запросами.
    @Test
    void deleteComment_ownerCanDelete() throws Exception {
        Long commentId = postComment(residentToken, eventId, "Удалить меня", 4);

        mockMvc.perform(delete("/api/comments/" + commentId)
                .header("Authorization", "Bearer " + residentToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));

        mockMvc.perform(get("/api/comments/event/" + eventId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(0)));
    }

    // Администратор может удалить любой комментарий (например, нарушающий правила).
    @Test
    void deleteComment_adminCanDeleteAny() throws Exception {
        Long commentId = postComment(residentToken, eventId, "Нарушение", 1);

        mockMvc.perform(delete("/api/comments/" + commentId)
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));
    }

    // Удаление без токена — 401.
    @Test
    void deleteComment_requiresAuthentication() throws Exception {
        Long commentId = postComment(residentToken, eventId, "Текст", 5);

        mockMvc.perform(delete("/api/comments/" + commentId))
            .andExpect(status().isUnauthorized());
    }

    // Несуществующий ID → 404. Важно проверить именно 404, а не 400 или 500.
    @Test
    void deleteComment_notFoundReturnsNotFound() throws Exception {
        mockMvc.perform(delete("/api/comments/999999")
                .header("Authorization", "Bearer " + residentToken))
            .andExpect(status().isNotFound());
    }

    // ─── helpers ──────────────────────────────────────────────────────────────

    // Вспомогательный метод: создаёт комментарий через API и возвращает его commentId.
    // Используется в тестах редактирования/удаления, чтобы не дублировать код создания.
    private Long postComment(String token, Long eventId, String text, int rating) throws Exception {
        String response = mockMvc.perform(post("/api/comments")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"eventId\":" + eventId + ",\"text\":\"" + text + "\",\"rating\":" + rating + "}"))
            .andExpect(status().isCreated())
            .andReturn()
            .getResponse()
            .getContentAsString();

        return objectMapper.readTree(response).path("commentId").asLong();
    }

    // Создаёт опубликованное мероприятие с фиксированным заголовком через родительский метод.
    private Long createPublishedEvent() {
        return createPublishedEvent("Мероприятие для комментариев");
    }
}
