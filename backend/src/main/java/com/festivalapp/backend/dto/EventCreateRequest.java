package com.festivalapp.backend.dto;

import com.festivalapp.backend.entity.EventStatus;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

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

    private EventStatus status;

    private Long organizerId;

    private Set<Long> categoryIds;
}
