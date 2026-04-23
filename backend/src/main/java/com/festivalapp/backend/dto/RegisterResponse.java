package com.festivalapp.backend.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class RegisterResponse {

    private String message;
    private String email;
    private boolean emailVerificationRequired;
}
