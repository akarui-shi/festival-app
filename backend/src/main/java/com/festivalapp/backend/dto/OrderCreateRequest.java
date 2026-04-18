package com.festivalapp.backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class OrderCreateRequest {

    @NotNull(message = "Session ID is required")
    private Long sessionId;

    @Valid
    private List<OrderItemCreateRequest> items;

    private String currency;

    private String paymentProvider;

    private String successUrl;

    private String cancelUrl;
}
