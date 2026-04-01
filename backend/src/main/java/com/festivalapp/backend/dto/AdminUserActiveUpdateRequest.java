package com.festivalapp.backend.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AdminUserActiveUpdateRequest {

    @NotNull(message = "Active flag is required")
    private Boolean active;
}

