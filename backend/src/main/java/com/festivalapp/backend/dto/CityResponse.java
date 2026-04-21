package com.festivalapp.backend.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CityResponse {

    private Long id;
    private String name;
    private String region;
    private String country;
    private Boolean active;
}
