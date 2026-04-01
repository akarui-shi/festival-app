package com.festivalapp.backend.dto;

import com.festivalapp.backend.entity.RegistrationStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class MyRegistrationResponse {

    private Long registrationId;
    private Long sessionId;
    private String eventTitle;
    private String sessionTitle;
    private String venueName;
    private LocalDateTime startAt;
    private Integer quantity;
    private RegistrationStatus status;
    private String qrToken;
    private LocalDateTime createdAt;
}
