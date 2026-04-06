package com.festivalapp.backend.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

@Getter
@Setter
public class EventCreateRequest {

    @NotBlank(message = "Title is required")
    @Size(max = 255, message = "Title is too long")
    private String title;

    @Size(max = 500, message = "Short description is too long")
    private String shortDescription;

    private String fullDescription;

    @Min(value = 0, message = "Age rating must be >= 0")
    @Max(value = 21, message = "Age rating must be <= 21")
    private Integer ageRating;

    private String coverUrl;

    private Long venueId;

    @Size(max = 500, message = "Venue address is too long")
    private String venueAddress;

    @DecimalMin(value = "-90.0", message = "Latitude must be >= -90")
    @DecimalMax(value = "90.0", message = "Latitude must be <= 90")
    private BigDecimal venueLatitude;

    @DecimalMin(value = "-180.0", message = "Longitude must be >= -180")
    @DecimalMax(value = "180.0", message = "Longitude must be <= 180")
    private BigDecimal venueLongitude;

    private Long venueCityId;

    @Size(max = 255, message = "Venue city name is too long")
    private String venueCityName;

    @Size(max = 255, message = "Venue region is too long")
    private String venueRegion;

    @Size(max = 255, message = "Venue country is too long")
    private String venueCountry;

    @Size(max = 255, message = "Venue name is too long")
    private String venueName;

    @Size(max = 500, message = "Venue contacts is too long")
    private String venueContacts;

    @Min(value = 0, message = "Venue capacity must be >= 0")
    private Integer venueCapacity;

    private Set<Long> categoryIds;

    private List<EventImageRequest> eventImages;
}
