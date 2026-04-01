package com.festivalapp.backend.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.Set;

@Getter
@Builder
public class AdminUserResponse {

    private Long id;
    private String login;
    private String email;
    private String firstName;
    private String lastName;
    private String phone;
    private Set<String> roles;
    private boolean active;
}

