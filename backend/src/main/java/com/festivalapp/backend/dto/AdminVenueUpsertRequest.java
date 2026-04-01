package com.festivalapp.backend.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class AdminVenueUpsertRequest {

    @NotBlank(message = "Venue name is required")
    @Size(max = 255, message = "Venue name is too long")
    private String name;

    @NotBlank(message = "Venue address is required")
    @Size(max = 500, message = "Venue address is too long")
    private String address;

    @Min(value = 0, message = "Capacity must be >= 0")
    private Integer capacity;

    private BigDecimal latitude;
    private BigDecimal longitude;

    @NotNull(message = "City ID is required")
    private Long cityId;
}

