package com.festivalapp.backend.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class AnalyticsSessionLoadResponse {

    private Long sessionId;
    private String label;
    private LocalDateTime startAt;
    private Integer capacity;
    private int activeParticipants;
    private int occupancyPercent;
}
