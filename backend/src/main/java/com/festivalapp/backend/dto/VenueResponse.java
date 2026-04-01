package com.festivalapp.backend.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class VenueResponse {

    private Long id;
    private String name;
    private String address;
    private Integer capacity;
    private Long cityId;
    private String cityName;
}
