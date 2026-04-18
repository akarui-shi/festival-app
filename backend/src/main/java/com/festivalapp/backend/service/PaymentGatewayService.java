package com.festivalapp.backend.service;

import com.festivalapp.backend.entity.Order;
import lombok.Builder;
import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.UUID;

@Service
public class PaymentGatewayService {

    @Value("${app.frontend-base-url:http://localhost:5173}")
    private String frontendBaseUrl;

    public PaymentCheckout createCheckout(Order order,
                                          String provider,
                                          String successUrl,
                                          String cancelUrl) {
        String normalizedProvider = normalizeProvider(provider);
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
            + "&provider=" + normalizedProvider
            + "&successUrl=" + encode(defaultSuccess)
            + "&cancelUrl=" + encode(defaultCancel);

        return PaymentCheckout.builder()
            .externalPaymentId(externalPaymentId)
            .provider(normalizedProvider)
            .paymentUrl(paymentUrl)
            .successUrl(defaultSuccess)
            .cancelUrl(defaultCancel)
            .build();
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
    }
}
