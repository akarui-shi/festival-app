package com.festivalapp.backend.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
public class SessionCreateRequest {

    @NotNull(message = "Event ID is required")
    private Long eventId;

    private Long venueId;

    private String sessionTitle;

    @NotNull(message = "Start time is required")
    private LocalDateTime startAt;

    @NotNull(message = "End time is required")
    private LocalDateTime endAt;

    @NotNull(message = "Capacity is required")
    @Positive(message = "Capacity must be greater than 0")
    private Integer capacity;

    private String manualAddress;

    @DecimalMin(value = "-90.0", message = "Latitude must be >= -90")
    @DecimalMax(value = "90.0", message = "Latitude must be <= 90")
    private BigDecimal latitude;

    @DecimalMin(value = "-180.0", message = "Longitude must be >= -180")
    @DecimalMax(value = "180.0", message = "Longitude must be <= 180")
    private BigDecimal longitude;

    private String participationType;

    @DecimalMin(value = "0.0", message = "Price must be >= 0")
    private BigDecimal price;

    private String currency;

    private LocalDateTime salesStartAt;

    private LocalDateTime salesEndAt;
}
