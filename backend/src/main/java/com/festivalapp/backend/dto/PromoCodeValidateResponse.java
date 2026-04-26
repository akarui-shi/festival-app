package com.festivalapp.backend.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@Builder
public class PromoCodeValidateResponse {
    private boolean valid;
    private String discountType;
    private BigDecimal discountValue;
    private String description;
}
