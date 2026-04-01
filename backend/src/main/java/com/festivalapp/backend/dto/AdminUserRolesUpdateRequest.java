package com.festivalapp.backend.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;
import lombok.Setter;

import java.util.Set;

@Getter
@Setter
public class AdminUserRolesUpdateRequest {

    @NotEmpty(message = "Roles are required")
    private Set<String> roles;
}

