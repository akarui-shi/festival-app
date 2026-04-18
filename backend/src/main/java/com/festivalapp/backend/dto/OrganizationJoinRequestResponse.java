package com.festivalapp.backend.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class OrganizationJoinRequestResponse {

    private Long requestId;
    private Long organizationId;
    private String organizationName;
    private Long userId;
    private String userName;
    private String userEmail;
    private String message;
    private String status;
    private String decisionComment;
    private LocalDateTime requestedAt;
    private LocalDateTime reviewedAt;
    private Long reviewedByUserId;
    private String reviewedByName;
}
