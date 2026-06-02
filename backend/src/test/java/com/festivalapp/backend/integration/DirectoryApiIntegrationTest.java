package com.festivalapp.backend.integration;

import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Интеграционные тесты для публичных справочников: категории, площадки, города.
 * Уровень: integration. Все эндпоинты публичны (не требуют авторизации).
 * Данные заполняются Flyway-миграциями: V2 — категории и площадки Коломны, V10 — ~1134 города России.
 */
class DirectoryApiIntegrationTest extends AbstractIntegrationTest {

    // ─── GET /api/categories ──────────────────────────────────────────────────

    // Категории заполняются миграцией V2, поэтому их всегда больше 0.
    // Проверяем наличие id и name у первого элемента — минимальный контракт DTO.
    @Test
    void getCategories_returnsPublicList() throws Exception {
        // V2 seed inserts categories
        mockMvc.perform(get("/api/categories"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray())
            .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))))
            .andExpect(jsonPath("$[0].id").exists())
            .andExpect(jsonPath("$[0].name").exists());
    }

    // Справочник категорий — публичный: токен не нужен.
    @Test
    void getCategories_doesNotRequireAuthentication() throws Exception {
        // Public endpoint — no Authorization header
        mockMvc.perform(get("/api/categories"))
            .andExpect(status().isOk());
    }

    // Категории должны возвращаться в алфавитном порядке — это требование UX для фильтрации.
    // Тест перебирает имена последовательно и сравнивает каждую пару соседей.
    @Test
    void getCategories_sortedAlphabetically() throws Exception {
        String response = mockMvc.perform(get("/api/categories"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();

        var names = objectMapper.readTree(response).findValuesAsText("name");
        for (int i = 1; i < names.size(); i++) {
            String prev = names.get(i - 1).toLowerCase();
            String curr = names.get(i).toLowerCase();
            assert prev.compareTo(curr) <= 0 : "Categories not sorted: " + prev + " > " + curr;
        }
    }

    // ─── GET /api/venues ──────────────────────────────────────────────────────

    // Площадки Коломны заполняются миграцией V2. Проверяем, что список непустой.
    @Test
    void getVenues_returnsPublicList() throws Exception {
        // V2 seed inserts Kolomna venues
        mockMvc.perform(get("/api/venues"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray())
            .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))))
            .andExpect(jsonPath("$[0].id").exists())
            .andExpect(jsonPath("$[0].name").exists());
    }

    // Площадки — публичный справочник.
    @Test
    void getVenues_doesNotRequireAuthentication() throws Exception {
        mockMvc.perform(get("/api/venues"))
            .andExpect(status().isOk());
    }

    // Проверяем поле cityId в ответе: оно нужно фронтенду для связи площадки с городом.
    @Test
    void getVenues_hasExpectedFields() throws Exception {
        mockMvc.perform(get("/api/venues"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].id").exists())
            .andExpect(jsonPath("$[0].name").exists())
            .andExpect(jsonPath("$[0].cityId").exists());
    }

    // ─── GET /api/cities ──────────────────────────────────────────────────────

    // Миграция V10 вставляет ~1134 российских городов. Поле country должно быть «Россия».
    @Test
    void getCities_returnsPublicList() throws Exception {
        // V10 migration inserts ~1134 Russian cities
        mockMvc.perform(get("/api/cities"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray())
            .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))))
            .andExpect(jsonPath("$[0].id").exists())
            .andExpect(jsonPath("$[0].name").exists())
            .andExpect(jsonPath("$[0].country").value("Россия"));
    }

    // Поиск по точному имени «Коломна» должен вернуть хотя бы один результат именно с этим именем.
    @Test
    void getCities_searchByQueryFiltersResults() throws Exception {
        mockMvc.perform(get("/api/cities?q=Коломна"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray())
            .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))))
            .andExpect(jsonPath("$[0].name").value("Коломна"));
    }

    // Параметр limit=5 должен ограничивать размер выборки ровно до 5 элементов.
    @Test
    void getCities_limitCapsList() throws Exception {
        mockMvc.perform(get("/api/cities?limit=5"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(5)));
    }

    // Города — публичный справочник.
    @Test
    void getCities_doesNotRequireAuthentication() throws Exception {
        mockMvc.perform(get("/api/cities"))
            .andExpect(status().isOk());
    }

    // Пустой q= эквивалентен отсутствию фильтра — должны вернуться все активные города (более 100).
    @Test
    void getCities_searchEmptyQueryReturnsAll() throws Exception {
        mockMvc.perform(get("/api/cities?q="))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray())
            .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(100))));
    }
}
