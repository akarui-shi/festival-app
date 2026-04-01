package com.festivalapp.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LoginRequest {

    @NotBlank(message = "Введите логин или электронную почту")
    private String loginOrEmail;

    @NotBlank(message = "Введите пароль")
    private String password;
}
