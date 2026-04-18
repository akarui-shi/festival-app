package com.festivalapp.backend.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class AdminActionResponse {

    private Long id;
    private Long adminId;
    private String adminName;
    private String actionType;
    private String entityType;
    private Long entityId;
    private String details;
    private LocalDateTime createdAt;
}
