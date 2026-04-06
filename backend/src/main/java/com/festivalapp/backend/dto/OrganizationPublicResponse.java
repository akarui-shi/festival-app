package com.festivalapp.backend.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class OrganizationPublicResponse {

    private Long id;
    private String name;
    private String description;
    private String contacts;
}
