package com.festivalapp.backend.dto;

import com.festivalapp.backend.entity.EventStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class EventCreateRequest {

    @NotBlank(message = "Title is required")
    private String title;

    private String shortDescription;

    private String fullDescription;

    private Integer ageRating;

    @NotNull(message = "Organizer ID is required")
    private Long organizerId;

    private EventStatus status;
}
