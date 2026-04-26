package com.festivalapp.backend.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Getter
@Builder
public class PromoCodeResponse {
    private Long id;
    private String code;
    private String discountType;
    private BigDecimal discountValue;
    private Integer maxUsages;
    private int usageCount;
    private OffsetDateTime expiresAt;
    private boolean active;
    private OffsetDateTime createdAt;
}
