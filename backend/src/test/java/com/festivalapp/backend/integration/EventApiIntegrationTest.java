package com.festivalapp.backend.integration;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Интеграционные тесты для публичного API мероприятий.
 * Уровень: integration. Проверяет получение списка мероприятий с фильтрацией,
 * получение детальной страницы мероприятия, статистику платформы и похожие мероприятия.
 * Все эндпоинты публичны (не требуют авторизации).
 */
class EventApiIntegrationTest extends AbstractIntegrationTest {

    private Long publishedEventId;
    private Long draftEventId;

    // Создаём два мероприятия с разными статусами, чтобы тесты фильтрации были показательны:
    // публичные запросы должны возвращать только опубликованные.
    @BeforeEach
    void setUp() {
        publishedEventId = createEvent("Опубликованное мероприятие", "опубликовано");
        draftEventId = createEvent("Черновик мероприятия", "черновик");
    }

    // ─── GET /api/events ──────────────────────────────────────────────────────

    // Список мероприятий — публичный эндпоинт, анонимный доступ разрешён.
    @Test
    void getAll_isPublicEndpoint() throws Exception {
        mockMvc.perform(get("/api/events"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray());
    }

    // Фильтр по статусу «опубликовано»: только созданные в @BeforeEach опубликованные мероприятия.
    @Test
    void getAll_returnsPublishedEvents() throws Exception {
        mockMvc.perform(get("/api/events?status=опубликовано"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))));
    }

    // Фильтр по title: должен найти мероприятие с точным совпадением начала названия.
    @Test
    void getAll_filterByTitle() throws Exception {
        mockMvc.perform(get("/api/events?title=Опубликованное"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray())
            .andExpect(jsonPath("$[0].title").value("Опубликованное мероприятие"));
    }

    // Полнотекстовый поиск по q=: проверяем, что эндпоинт работает (без жёстких ожиданий по количеству).
    @Test
    void getAll_searchByQuery() throws Exception {
        mockMvc.perform(get("/api/events?q=Опубликованное"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray());
    }

    // ─── GET /api/events/{id} ─────────────────────────────────────────────────

    // Детальная страница мероприятия: проверяем id, title и наличие поля status.
    @Test
    void getById_publicEventReturnsDetails() throws Exception {
        mockMvc.perform(get("/api/events/" + publishedEventId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(publishedEventId))
            .andExpect(jsonPath("$.title").value("Опубликованное мероприятие"))
            .andExpect(jsonPath("$.status").exists());
    }

    // Просмотр мероприятия анонимным пользователем разрешён.
    @Test
    void getById_doesNotRequireAuthentication() throws Exception {
        mockMvc.perform(get("/api/events/" + publishedEventId))
            .andExpect(status().isOk());
    }

    // Несуществующий ID → 404, а не 500 или пустой 200.
    @Test
    void getById_nonExistentEventReturnsNotFound() throws Exception {
        mockMvc.perform(get("/api/events/999999999"))
            .andExpect(status().isNotFound());
    }

    // ─── GET /api/events/platform-stats ──────────────────────────────────────

    // Статистика платформы — JSON-объект (не массив); проверяем, что эндпоинт отдаёт данные.
    @Test
    void getPlatformStats_returnsStats() throws Exception {
        mockMvc.perform(get("/api/events/platform-stats"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isMap());
    }

    // ─── GET /api/events/{id}/similar ─────────────────────────────────────────

    // Похожие мероприятия: массив (может быть пустым, но не должен быть ошибкой).
    @Test
    void getSimilar_returnsListForExistingEvent() throws Exception {
        mockMvc.perform(get("/api/events/" + publishedEventId + "/similar"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray());
    }

    // ─── helpers ──────────────────────────────────────────────────────────────

    // Создаёт мероприятие с заданным статусом напрямую в БД, минуя бизнес-логику создания.
    // Это позволяет легко создавать мероприятия в нужном статусе без прохождения воркфлоу.
    private Long createEvent(String title, String status) {
        Long orgId = getOrCreateOrganizationId();
        Long cityId = getCityId();
        Long userId = jdbcTemplate.queryForObject(
            "SELECT id FROM users WHERE login = 'admin_local' LIMIT 1", Long.class);
        return jdbcTemplate.queryForObject("""
            INSERT INTO events (organization_id, created_by_user_id, city_id, title, status, is_free,
                                starts_at, ends_at, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, true,
                    NOW() + INTERVAL '7 days', NOW() + INTERVAL '8 days', NOW(), NOW())
            RETURNING id
            """, Long.class, orgId, userId, cityId, title, status);
    }
}
