package com.festivalapp.backend.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class OrganizationUpdateRequest {

    private String name;
    private String description;
    private String contactEmail;
    private String contactPhone;
    private String website;
    private String socialLinks;
    private Long logoImageId;
    private Long coverImageId;
}
