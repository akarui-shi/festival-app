package com.festivalapp.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateCurrentUserRequest {

    @NotBlank(message = "Введите логин")
    @Size(min = 3, max = 64, message = "Логин должен содержать от 3 до 64 символов")
    private String login;

    @NotBlank(message = "Введите электронную почту")
    @Email(message = "Введите корректный адрес электронной почты")
    private String email;

    @Size(max = 100, message = "Имя не должно превышать 100 символов")
    private String firstName;

    @Size(max = 100, message = "Фамилия не должна превышать 100 символов")
    private String lastName;

    @Size(max = 32, message = "Телефон не должен превышать 32 символа")
    private String phone;

    @Min(value = 1, message = "Некорректный идентификатор изображения")
    private Long avatarImageId;

    private Boolean newEventsNotificationsEnabled;
}
