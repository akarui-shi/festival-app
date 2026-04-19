package com.festivalapp.backend.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class OrganizerOrganizationOptionResponse {

    private Long id;
    private String name;
    private String membershipStatus;
    private Long cityId;
    private String cityName;
}
