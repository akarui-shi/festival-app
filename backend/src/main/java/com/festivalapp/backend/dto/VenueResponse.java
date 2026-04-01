package com.festivalapp.backend.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@Builder
public class VenueResponse {

    private Long id;
    private String name;
    private String address;
    private String contacts;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private Integer capacity;
    private Long cityId;
    private String cityName;
}
