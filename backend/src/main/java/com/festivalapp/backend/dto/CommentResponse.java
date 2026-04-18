package com.festivalapp.backend.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class CommentResponse {

    private Long commentId;
    private Long eventId;
    private Long userId;
    private String userDisplayName;
    private String text;
    private Integer rating;
    private String moderationStatus;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
