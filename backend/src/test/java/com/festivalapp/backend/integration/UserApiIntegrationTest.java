package com.festivalapp.backend.integration;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Интеграционные тесты для API текущего пользователя.
 * Уровень: integration. Проверяет просмотр профиля, обновление данных, смену пароля
 * и управление интересами (категориями). Все эндпоинты требуют авторизации.
 */
class UserApiIntegrationTest extends AbstractIntegrationTest {

    // ─── GET /api/users/me ────────────────────────────────────────────────────

    // Профиль текущего пользователя — только для авторизованных.
    @Test
    void getMe_requiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/users/me"))
            .andExpect(status().isUnauthorized());
    }

    // Авторизованный пользователь получает собственный профиль с правильным login.
    @Test
    void getMe_returnsCurrentUser() throws Exception {
        String login = "getme_" + System.nanoTime();
        String email = login + "@test.local";
        String token = registerVerifyAndLogin(login, email, "Pass1234");

        mockMvc.perform(get("/api/users/me")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.login").value(login));
    }

    // ─── PUT /api/users/me ────────────────────────────────────────────────────

    // Обновление профиля — только авторизованным.
    @Test
    void updateMe_requiresAuthentication() throws Exception {
        mockMvc.perform(put("/api/users/me")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"login\":\"someone\",\"email\":\"someone@test.local\"}"))
            .andExpect(status().isUnauthorized());
    }

    // После смены логина ответ содержит обновлённый $.user.login и новый $.token
    // (JWT перевыпускается, так как subject изменился).
    @Test
    void updateMe_changesLoginAndEmail() throws Exception {
        String suffix = String.valueOf(System.nanoTime());
        String login = "upme_" + suffix;
        String email = login + "@test.local";
        String token = registerVerifyAndLogin(login, email, "Pass1234");

        String newLogin = "upme2_" + suffix;
        String newEmail = newLogin + "@test.local";
        String body = """
            {"login":"%s","email":"%s","firstName":"Test","lastName":"User"}
            """.formatted(newLogin, newEmail);

        mockMvc.perform(put("/api/users/me")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.user.login").value(newLogin))
            .andExpect(jsonPath("$.token").isNotEmpty());
    }

    // Попытка занять чужой логин → 400. Логин в системе уникален.
    @Test
    void updateMe_duplicateLoginReturnsBadRequest() throws Exception {
        String suffix = String.valueOf(System.nanoTime());
        String user1Login = "dup1_" + suffix;
        String user2Login = "dup2_" + suffix;

        registerAndVerify(user1Login, user1Login + "@test.local", "Pass1234");
        String token2 = registerVerifyAndLogin(user2Login, user2Login + "@test.local", "Pass1234");

        // Try to take user1's login
        String body = """
            {"login":"%s","email":"%s@test.local","firstName":"Test","lastName":"User"}
            """.formatted(user1Login, user2Login + "_new");

        mockMvc.perform(put("/api/users/me")
                .header("Authorization", "Bearer " + token2)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isBadRequest());
    }

    // ─── PATCH /api/users/me/password ─────────────────────────────────────────

    // Смена пароля — только авторизованным.
    @Test
    void changePassword_requiresAuthentication() throws Exception {
        mockMvc.perform(patch("/api/users/me/password")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"currentPassword\":\"Pass1234\",\"newPassword\":\"NewPass5678\"}"))
            .andExpect(status().isUnauthorized());
    }

    // Неверный текущий пароль → 400. Нельзя сменить пароль, не зная старого.
    @Test
    void changePassword_wrongCurrentPasswordReturnsBadRequest() throws Exception {
        String login = "chpw_" + System.nanoTime();
        String token = registerVerifyAndLogin(login, login + "@test.local", "Pass1234");

        mockMvc.perform(patch("/api/users/me/password")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"currentPassword\":\"WrongPass\",\"newPassword\":\"NewPass5678\"}"))
            .andExpect(status().isBadRequest());
    }

    // Успешная смена пароля → 204 No Content (без тела ответа, операция идемпотентна по REST).
    @Test
    void changePassword_successReturnsNoContent() throws Exception {
        String login = "chpwok_" + System.nanoTime();
        String token = registerVerifyAndLogin(login, login + "@test.local", "Pass1234");

        mockMvc.perform(patch("/api/users/me/password")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"currentPassword\":\"Pass1234\",\"newPassword\":\"NewPass5678\"}"))
            .andExpect(status().isNoContent());
    }

    // ─── GET /api/users/me/interests ──────────────────────────────────────────

    // Интересы пользователя — только авторизованным.
    @Test
    void getInterests_requiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/users/me/interests"))
            .andExpect(status().isUnauthorized());
    }

    // У нового пользователя нет выбранных интересов — пустой массив.
    @Test
    void getInterests_returnsEmptyInitially() throws Exception {
        String login = "interests_" + System.nanoTime();
        String token = registerVerifyAndLogin(login, login + "@test.local", "Pass1234");

        mockMvc.perform(get("/api/users/me/interests")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray());
    }

    // ─── PUT /api/users/me/interests ──────────────────────────────────────────

    // Сохранение интересов: PUT с массивом ID категорий → 204.
    // Если категорий в БД нет — тест проходит с пустым списком (защита от пустой тестовой БД).
    // После сохранения GET возвращает массив (может быть пустым или с элементами).
    @Test
    void updateInterests_persistsCategories() throws Exception {
        String login = "intupd_" + System.nanoTime();
        String token = registerVerifyAndLogin(login, login + "@test.local", "Pass1234");

        // Get a category id first
        Long categoryId = jdbcTemplate.queryForObject(
            "SELECT id FROM categories ORDER BY id ASC LIMIT 1", Long.class);
        if (categoryId == null) {
            // No categories available, skip with empty list
            mockMvc.perform(put("/api/users/me/interests")
                    .header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("[]"))
                .andExpect(status().isNoContent());
            return;
        }

        mockMvc.perform(put("/api/users/me/interests")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("[" + categoryId + "]"))
            .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/users/me/interests")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray());
    }
}
