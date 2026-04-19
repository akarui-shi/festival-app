package com.festivalapp.backend.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class OrganizerEventBasicInfoRequest {

    private String title;
    private String shortDescription;
    private String fullDescription;
    private String ageRestriction;
}
