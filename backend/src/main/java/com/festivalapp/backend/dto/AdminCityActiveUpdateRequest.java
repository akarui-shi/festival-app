package com.festivalapp.backend.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AdminCityActiveUpdateRequest {

    @NotNull
    private Boolean active;
}
