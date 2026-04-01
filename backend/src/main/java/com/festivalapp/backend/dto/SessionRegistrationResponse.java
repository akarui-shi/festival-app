package com.festivalapp.backend.dto;

import com.festivalapp.backend.entity.RegistrationStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class SessionRegistrationResponse {

    private Long registrationId;
    private Long userId;
    private String userFullName;
    private Integer quantity;
    private RegistrationStatus status;
    private String qrToken;
    private LocalDateTime createdAt;
}
