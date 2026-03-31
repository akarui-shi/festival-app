package com.festivalapp.backend.dto;

import com.festivalapp.backend.entity.UserStatus;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class UserResponse {

    private Long id;
    private String login;
    private String email;
    private String phone;
    private String firstName;
    private String lastName;
    private String avatarUrl;
    private UserStatus status;
}
