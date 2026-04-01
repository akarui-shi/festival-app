package com.festivalapp.backend.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class FavoriteCreateRequest {

    @NotNull(message = "Event ID is required")
    private Long eventId;
}
