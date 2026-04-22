package com.festivalapp.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.festivalapp.backend.entity.Order;
import com.festivalapp.backend.exception.BadRequestException;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class PaymentGatewayService {

    @Value("${app.frontend-base-url:http://localhost:5173}")
    private String frontendBaseUrl;
    @Value("${payments.yookassa.shop-id:}")
    private String yookassaShopId;
    @Value("${payments.yookassa.secret-key:}")
    private String yookassaSecretKey;
    @Value("${payments.yookassa.api-base-url:https://api.yookassa.ru/v3}")
    private String yookassaApiBaseUrl;

    private final RestTemplateBuilder restTemplateBuilder;

    public PaymentCheckout createCheckout(Order order,
                                          String provider,
                                          String successUrl,
                                          String cancelUrl) {
        String normalizedProvider = normalizeProvider(provider);
        if ("yookassa".equals(normalizedProvider)) {
            return createYookassaCheckout(order, successUrl, cancelUrl);
        }
        return createLocalCheckout(order, normalizedProvider, successUrl, cancelUrl);
    }

    public GatewayStatus resolvePaymentStatus(String provider, String externalPaymentId) {
        String normalizedProvider = normalizeProvider(provider);
        if (!"yookassa".equals(normalizedProvider)) {
            return GatewayStatus.builder().status("succeeded").build();
        }
        return fetchYookassaStatus(externalPaymentId);
    }

    private PaymentCheckout createYookassaCheckout(Order order,
                                                   String successUrl,
                                                   String cancelUrl) {
        if (!StringUtils.hasText(yookassaShopId) || !StringUtils.hasText(yookassaSecretKey)) {
            throw new BadRequestException("ЮKassa не настроена: укажите YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY");
        }

        String defaultSuccess = StringUtils.hasText(successUrl)
            ? successUrl.trim()
            : frontendBaseUrl + "/payment/result?orderId=" + order.getId() + "&provider=yookassa";

        String defaultCancel = StringUtils.hasText(cancelUrl)
            ? cancelUrl.trim()
            : frontendBaseUrl + "/payment/result?orderId=" + order.getId() + "&provider=yookassa";

        Map<String, Object> requestBody = Map.of(
            "amount", Map.of(
                "value", normalizeAmount(order.getTotalAmount()),
                "currency", normalizeCurrency(order.getCurrency())
            ),
            "capture", true,
            "confirmation", Map.of(
                "type", "redirect",
                "return_url", defaultSuccess
            ),
            "description", "Оплата заказа #" + order.getId(),
            "metadata", Map.of("order_id", String.valueOf(order.getId()))
        );

        JsonNode response = exchangeYookassa(
            HttpMethod.POST,
            yookassaApiBaseUrl + "/payments",
            requestBody,
            true
        );

        String externalPaymentId = response.path("id").asText(null);
        String paymentUrl = response.path("confirmation").path("confirmation_url").asText(null);
        String status = response.path("status").asText("pending");

        if (!StringUtils.hasText(externalPaymentId) || !StringUtils.hasText(paymentUrl)) {
            log.error("ЮKassa ответила без id/confirmation_url: {}", response);
            throw new BadRequestException("Не удалось создать платеж в ЮKassa");
        }

        return PaymentCheckout.builder()
            .externalPaymentId(externalPaymentId)
            .provider("yookassa")
            .paymentUrl(paymentUrl)
            .successUrl(defaultSuccess)
            .cancelUrl(defaultCancel)
            .gatewayStatus(status)
            .gatewayPayload(response)
            .build();
    }

    private PaymentCheckout createLocalCheckout(Order order,
                                                String provider,
                                                String successUrl,
                                                String cancelUrl) {
        String externalPaymentId = UUID.randomUUID().toString();

        String defaultSuccess = StringUtils.hasText(successUrl)
            ? successUrl.trim()
            : frontendBaseUrl + "/payment/result?orderId=" + order.getId() + "&status=success";

        String defaultCancel = StringUtils.hasText(cancelUrl)
            ? cancelUrl.trim()
            : frontendBaseUrl + "/payment/result?orderId=" + order.getId() + "&status=cancel";

        String paymentUrl = frontendBaseUrl
            + "/payment/checkout?orderId=" + order.getId()
            + "&paymentId=" + externalPaymentId
            + "&provider=" + provider
            + "&successUrl=" + encode(defaultSuccess)
            + "&cancelUrl=" + encode(defaultCancel);

        return PaymentCheckout.builder()
            .externalPaymentId(externalPaymentId)
            .provider(provider)
            .paymentUrl(paymentUrl)
            .successUrl(defaultSuccess)
            .cancelUrl(defaultCancel)
            .gatewayStatus("pending")
            .gatewayPayload(null)
            .build();
    }

    private GatewayStatus fetchYookassaStatus(String externalPaymentId) {
        if (!StringUtils.hasText(externalPaymentId)) {
            throw new BadRequestException("Не указан идентификатор платежа ЮKassa");
        }
        JsonNode response = exchangeYookassa(
            HttpMethod.GET,
            yookassaApiBaseUrl + "/payments/" + externalPaymentId,
            null,
            false
        );
        return GatewayStatus.builder()
            .status(response.path("status").asText("pending"))
            .payload(response)
            .build();
    }

    private JsonNode exchangeYookassa(HttpMethod method,
                                      String url,
                                      Object body,
                                      boolean withIdempotenceKey) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE);
        headers.set(HttpHeaders.AUTHORIZATION, buildBasicAuthHeader());
        if (withIdempotenceKey) {
            headers.set("Idempotence-Key", UUID.randomUUID().toString());
        }

        HttpEntity<?> entity = body == null ? new HttpEntity<>(headers) : new HttpEntity<>(body, headers);
        try {
            RestTemplate restTemplate = restTemplateBuilder
                .setConnectTimeout(Duration.ofSeconds(10))
                .setReadTimeout(Duration.ofSeconds(20))
                .build();
            ResponseEntity<JsonNode> response = restTemplate.exchange(url, method, entity, JsonNode.class);
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                throw new BadRequestException("ЮKassa вернула некорректный ответ");
            }
            return response.getBody();
        } catch (RestClientException ex) {
            log.error("Ошибка запроса к ЮKassa: {}", ex.getMessage(), ex);
            throw new BadRequestException("Не удалось связаться с ЮKassa. Повторите попытку позже");
        }
    }

    private String buildBasicAuthHeader() {
        String value = yookassaShopId + ":" + yookassaSecretKey;
        String encoded = Base64.getEncoder().encodeToString(value.getBytes(StandardCharsets.UTF_8));
        return "Basic " + encoded;
    }

    private String normalizeAmount(BigDecimal amount) {
        BigDecimal safeAmount = amount == null ? BigDecimal.ZERO : amount;
        return safeAmount.setScale(2, RoundingMode.HALF_UP).toPlainString();
    }

    private String normalizeCurrency(String currency) {
        if (!StringUtils.hasText(currency)) {
            return "RUB";
        }
        return currency.trim().toUpperCase();
    }

    private String normalizeProvider(String provider) {
        if (!StringUtils.hasText(provider)) {
            return "yookassa";
        }

        String normalized = provider.trim().toLowerCase();
        if ("sbp".equals(normalized)) {
            return "sbp";
        }
        return "yookassa";
    }

    private String encode(String value) {
        return java.net.URLEncoder.encode(value, java.nio.charset.StandardCharsets.UTF_8);
    }

    @Getter
    @Builder
    public static class PaymentCheckout {
        private String externalPaymentId;
        private String provider;
        private String paymentUrl;
        private String successUrl;
        private String cancelUrl;
        private String gatewayStatus;
        private JsonNode gatewayPayload;
    }

    @Getter
    @Builder
    public static class GatewayStatus {
        private String status;
        private JsonNode payload;
    }
}
