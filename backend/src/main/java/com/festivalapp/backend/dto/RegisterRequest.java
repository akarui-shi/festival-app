package com.festivalapp.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RegisterRequest {

    @NotBlank(message = "Введите логин")
    @Size(min = 3, max = 64, message = "Логин должен содержать от 3 до 64 символов")
    private String login;

    @NotBlank(message = "Введите электронную почту")
    @Email(message = "Введите корректный адрес электронной почты")
    private String email;

    private String phone;

    @NotBlank(message = "Введите пароль")
    @Size(min = 6, max = 128, message = "Пароль должен содержать от 6 до 128 символов")
    private String password;

    private String role;

    private String companyName;

    private Long organizationId;

    private String joinRequestMessage;

    private String firstName;

    private String lastName;
}
