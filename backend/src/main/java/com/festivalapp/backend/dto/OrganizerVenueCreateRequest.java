package com.festivalapp.backend.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class OrganizerVenueCreateRequest {

    @NotBlank(message = "Venue name is required")
    @Size(max = 255, message = "Venue name is too long")
    private String name;

    @NotBlank(message = "Venue address is required")
    @Size(max = 500, message = "Venue address is too long")
    private String address;

    @Size(max = 500, message = "Venue contacts is too long")
    private String contacts;

    @DecimalMin(value = "-90.0", message = "Latitude must be >= -90")
    @DecimalMax(value = "90.0", message = "Latitude must be <= 90")
    private BigDecimal latitude;

    @DecimalMin(value = "-180.0", message = "Longitude must be >= -180")
    @DecimalMax(value = "180.0", message = "Longitude must be <= 180")
    private BigDecimal longitude;

    @Min(value = 0, message = "Capacity must be >= 0")
    private Integer capacity;

    @NotNull(message = "City ID is required")
    private Long cityId;
}
