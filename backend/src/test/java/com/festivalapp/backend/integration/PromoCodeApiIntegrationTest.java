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
 * Интеграционные тесты для API промокодов.
 * Уровень: integration. Проверяет создание промокодов организатором,
 * валидацию (публичный эндпоинт) и деактивацию через delete.
 * CRUD-операции /api/organizer/promo-codes защищены; /api/promo-codes/validate — публичный.
 */
class PromoCodeApiIntegrationTest extends AbstractIntegrationTest {

    private String organizerToken;

    // Создаём организатора с компанией — только члены организации могут создавать промокоды.
    // nanoTime обеспечивает уникальность имён между запусками тестов.
    @BeforeEach
    void setUp() throws Exception {
        // Register organizer with a new company
        String suffix = String.valueOf(System.nanoTime());
        String orgName = "Орг " + suffix;

        String body = """
            {
                "login": "org_%s",
                "email": "org_%s@test.local",
                "password": "Pass1234",
                "role": "ORGANIZER",
                "companyName": "%s"
            }
            """.formatted(suffix, suffix, orgName);

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isCreated());

        jdbcTemplate.update("UPDATE users SET email_verified = TRUE WHERE login = ?", "org_" + suffix);
        organizerToken = loginAndGetToken("org_" + suffix, "Pass1234");
    }

    // ─── GET /api/promo-codes ─────────────────────────────────────────────────

    // Список промокодов организатора — защищённый эндпоинт.
    @Test
    void getPromoCodes_requiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/organizer/promo-codes"))
            .andExpect(status().isUnauthorized());
    }

    // У нового организатора промокодов нет — пустой массив.
    @Test
    void getPromoCodes_returnsEmptyInitially() throws Exception {
        mockMvc.perform(get("/api/organizer/promo-codes")
                .header("Authorization", "Bearer " + organizerToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray())
            .andExpect(jsonPath("$", hasSize(0)));
    }

    // ─── POST /api/promo-codes ────────────────────────────────────────────────

    // Создание промокода — только для авторизованных организаторов.
    @Test
    void createPromoCode_requiresAuthentication() throws Exception {
        mockMvc.perform(post("/api/organizer/promo-codes")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"code\":\"TEST\",\"discountType\":\"PERCENT\",\"discountValue\":10}"))
            .andExpect(status().isUnauthorized());
    }

    // Создание промокода с процентной скидкой: проверяем, что код нормализуется в верхний регистр,
    // тип PERCENT сохраняется и $.active=true (промокод сразу активен после создания).
    @Test
    void createPromoCode_percentDiscount() throws Exception {
        String code = "PERC_" + System.nanoTime();

        mockMvc.perform(post("/api/organizer/promo-codes")
                .header("Authorization", "Bearer " + organizerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"code":"%s","discountType":"PERCENT","discountValue":15,"maxUsages":50}
                    """.formatted(code)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.code").value(code.toUpperCase()))
            .andExpect(jsonPath("$.discountType").value("PERCENT"))
            .andExpect(jsonPath("$.discountValue").value(15))
            .andExpect(jsonPath("$.active").value(true));
    }

    // Бесплатный билет (FREE) — скидка 100%: проверяем, что тип сохраняется корректно.
    @Test
    void createPromoCode_freeDiscount() throws Exception {
        String code = "FREE_" + System.nanoTime();

        mockMvc.perform(post("/api/organizer/promo-codes")
                .header("Authorization", "Bearer " + organizerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"code\":\"%s\",\"discountType\":\"FREE\",\"discountValue\":0}".formatted(code)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.discountType").value("FREE"));
    }

    // Второй запрос с тем же кодом — 400. Сообщение точно соответствует ожидаемому тексту ошибки.
    @Test
    void createPromoCode_duplicateCodeReturnsBadRequest() throws Exception {
        String code = "DUP_" + System.nanoTime();
        String body = "{\"code\":\"%s\",\"discountType\":\"FIXED\",\"discountValue\":100}".formatted(code);

        mockMvc.perform(post("/api/organizer/promo-codes")
                .header("Authorization", "Bearer " + organizerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isCreated());

        mockMvc.perform(post("/api/organizer/promo-codes")
                .header("Authorization", "Bearer " + organizerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("Промокод с таким кодом уже существует"));
    }

    // После создания промокод должен появиться в списке с нормализованным кодом в верхнем регистре.
    @Test
    void createPromoCode_appearsInList() throws Exception {
        String code = "LIST_" + System.nanoTime();

        mockMvc.perform(post("/api/organizer/promo-codes")
                .header("Authorization", "Bearer " + organizerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"code\":\"%s\",\"discountType\":\"PERCENT\",\"discountValue\":10}".formatted(code)))
            .andExpect(status().isCreated());

        mockMvc.perform(get("/api/organizer/promo-codes")
                .header("Authorization", "Bearer " + organizerToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(1)))
            .andExpect(jsonPath("$[0].code").value(code.toUpperCase()));
    }

    // ─── GET /api/promo-codes/validate ────────────────────────────────────────

    // Валидация промокода — публичный эндпоинт (покупатель проверяет код без авторизации).
    // После создания активного промокода validate должен вернуть $.valid=true и тип скидки.
    @Test
    void validatePromoCode_validCodeReturnsValid() throws Exception {
        String code = "VALID_" + System.nanoTime();

        mockMvc.perform(post("/api/organizer/promo-codes")
                .header("Authorization", "Bearer " + organizerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"code\":\"%s\",\"discountType\":\"PERCENT\",\"discountValue\":20}".formatted(code)))
            .andExpect(status().isCreated());

        mockMvc.perform(get("/api/promo-codes/validate?code=" + code.toUpperCase()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.valid").value(true))
            .andExpect(jsonPath("$.discountType").value("PERCENT"));
    }

    // Несуществующий промокод → $.valid=false (не 404, чтобы не раскрывать детали реализации).
    @Test
    void validatePromoCode_unknownCodeReturnsInvalid() throws Exception {
        mockMvc.perform(get("/api/promo-codes/validate?code=DOESNOTEXIST123"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.valid").value(false));
    }

    // Публичность эндпоинта: анонимный запрос возвращает 200.
    @Test
    void validatePromoCode_isPublicEndpoint() throws Exception {
        mockMvc.perform(get("/api/promo-codes/validate?code=ANY"))
            .andExpect(status().isOk());
    }

    // ─── DELETE /api/promo-codes/{id} ─────────────────────────────────────────

    // Delete деактивирует промокод (soft-delete): после этого validate возвращает $.valid=false.
    // Проверяем через три шага: создание → удаление → валидация.
    @Test
    void deletePromoCode_deactivatesCode() throws Exception {
        String code = "DEL_" + System.nanoTime();

        String createResponse = mockMvc.perform(post("/api/organizer/promo-codes")
                .header("Authorization", "Bearer " + organizerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"code\":\"%s\",\"discountType\":\"FIXED\",\"discountValue\":50}".formatted(code)))
            .andExpect(status().isCreated())
            .andReturn().getResponse().getContentAsString();

        Long promoId = objectMapper.readTree(createResponse).path("id").asLong();

        mockMvc.perform(delete("/api/organizer/promo-codes/" + promoId)
                .header("Authorization", "Bearer " + organizerToken))
            .andExpect(status().isNoContent());

        // After delete (deactivation), validate returns invalid
        mockMvc.perform(get("/api/promo-codes/validate?code=" + code.toUpperCase()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.valid").value(false));
    }

    // Удаление без токена — 401.
    @Test
    void deletePromoCode_requiresAuthentication() throws Exception {
        mockMvc.perform(delete("/api/organizer/promo-codes/1"))
            .andExpect(status().isUnauthorized());
    }
}
