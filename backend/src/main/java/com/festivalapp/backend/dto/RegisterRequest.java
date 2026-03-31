package com.festivalapp.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RegisterRequest {

    @NotBlank(message = "Login is required")
    @Size(min = 3, max = 64)
    private String login;

    @NotBlank(message = "Email is required")
    @Email
    private String email;

    private String phone;

    @NotBlank(message = "Password is required")
    @Size(min = 6, max = 128)
    private String password;

    private String firstName;

    private String lastName;
}
