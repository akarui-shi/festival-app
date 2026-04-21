package com.festivalapp.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AdminCityUpsertRequest {

    @NotBlank(message = "City name is required")
    @Size(max = 255, message = "City name is too long")
    private String name;

    @Size(max = 255, message = "Region is too long")
    private String region;

    @Size(max = 255, message = "Country is too long")
    private String country;

    private Boolean active;
}
