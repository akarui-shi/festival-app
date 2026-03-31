package com.festivalapp.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LoginRequest {

    @NotBlank(message = "Login or email is required")
    private String username;

    @NotBlank(message = "Password is required")
    private String password;
}
