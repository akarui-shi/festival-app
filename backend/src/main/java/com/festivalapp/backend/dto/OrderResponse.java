package com.festivalapp.backend.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
public class OrderResponse {

    private Long orderId;
    private Long eventId;
    private String eventTitle;
    private String status;
    private BigDecimal totalAmount;
    private String currency;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private boolean requiresPayment;
    private String paymentStatus;
    private String paymentProvider;
    private String paymentUrl;
    private List<OrderItemResponse> items;
}
