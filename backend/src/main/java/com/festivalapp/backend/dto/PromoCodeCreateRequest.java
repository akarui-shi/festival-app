package com.festivalapp.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Getter
@Setter
public class PromoCodeCreateRequest {

    @NotBlank
    private String code;

    @NotNull
    private String discountType; // PERCENT | FIXED | FREE

    private BigDecimal discountValue;

    private Integer maxUsages;

    private OffsetDateTime expiresAt;
}
