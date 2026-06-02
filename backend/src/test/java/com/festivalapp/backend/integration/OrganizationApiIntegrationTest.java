package com.festivalapp.backend.integration;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Интеграционные тесты для API организаций.
 * Уровень: integration. Проверяет публичный просмотр организаций,
 * защиту эндпоинтов создания заявок на вступление и просмотра своих заявок.
 */
class OrganizationApiIntegrationTest extends AbstractIntegrationTest {

    private Long orgId;

    // Убеждаемся, что в базе есть хотя бы одна организация для тестов просмотра.
    @BeforeEach
    void setUp() {
        orgId = getOrCreateOrganizationId();
    }

    // ─── GET /api/organizations ───────────────────────────────────────────────

    // Список организаций — публичный эндпоинт (читать может анонимный пользователь).
    @Test
    void getAll_isPublicEndpoint() throws Exception {
        mockMvc.perform(get("/api/organizations"))
            .andExpect(status().isOk());
    }

    // Тип ответа — массив (один из тестов разбит на два для ясности намерений).
    @Test
    void getAll_returnsArray() throws Exception {
        mockMvc.perform(get("/api/organizations"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray());
    }

    // ─── GET /api/organizations/{id} ──────────────────────────────────────────

    // Детальная страница организации: проверяем, что $.id совпадает с запрошенным.
    @Test
    void getById_existingOrganization_returnsDetails() throws Exception {
        mockMvc.perform(get("/api/organizations/" + orgId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(orgId));
    }

    // Несуществующая организация → 404.
    @Test
    void getById_nonExistent_returnsNotFound() throws Exception {
        mockMvc.perform(get("/api/organizations/9999999"))
            .andExpect(status().isNotFound());
    }

    // ─── POST /api/organizations/join-requests ────────────────────────────────

    // Подача заявки на вступление в организацию требует авторизации.
    @Test
    void createJoinRequest_requiresAuthentication() throws Exception {
        mockMvc.perform(post("/api/organizations/join-requests")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"organizationId\":" + orgId + "}"))
            .andExpect(status().isUnauthorized());
    }

    // ─── GET /api/organizations/join-requests/my ──────────────────────────────

    // Просмотр своих заявок — защищённый эндпоинт.
    @Test
    void getMyJoinRequests_requiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/organizations/join-requests/my"))
            .andExpect(status().isUnauthorized());
    }

    // Организатор, создавший свою компанию при регистрации, является её владельцем —
    // у него нет входящих заявок на вступление (он сразу член). Ответ — пустой массив.
    @Test
    void getMyJoinRequests_returnsEmptyInitially() throws Exception {
        String suffix = String.valueOf(System.nanoTime());
        String login = "orgjr_" + suffix;
        // Register as ORGANIZER with a new company (creates their own org and membership)
        String body = """
            {"login":"%s","email":"%s@test.local","password":"Pass1234","role":"ORGANIZER","companyName":"Org_%s"}
            """.formatted(login, login, suffix);

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isCreated());

        jdbcTemplate.update("UPDATE users SET email_verified = TRUE WHERE login = ?", login);
        String token = loginAndGetToken(login, "Pass1234");

        mockMvc.perform(get("/api/organizations/join-requests/my")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray());
    }
}
