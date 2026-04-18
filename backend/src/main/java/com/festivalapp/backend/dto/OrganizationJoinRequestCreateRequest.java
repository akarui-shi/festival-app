package com.festivalapp.backend.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class OrganizationJoinRequestCreateRequest {

    @NotNull
    private Long organizationId;

    private String message;
}
