package com.festivalapp.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class OrganizationJoinRequestDecisionRequest {

    @NotBlank
    private String decision;

    private String comment;
}
