package com.festivalapp.backend.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class ModerationResponse {

    private Long moderationId;
    private Long adminId;
    private String entityType;
    private Long entityId;
    private String decision;
    private String moderatorComment;
    private LocalDateTime decidedAt;
}
