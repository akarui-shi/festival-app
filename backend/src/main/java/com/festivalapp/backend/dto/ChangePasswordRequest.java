package com.festivalapp.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ChangePasswordRequest {

    @NotBlank(message = "Введите текущий пароль")
    @Size(min = 6, max = 128, message = "Текущий пароль должен содержать от 6 до 128 символов")
    private String currentPassword;

    @NotBlank(message = "Введите новый пароль")
    @Size(min = 6, max = 128, message = "Новый пароль должен содержать от 6 до 128 символов")
    private String newPassword;
}
