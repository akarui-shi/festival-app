package com.festivalapp.backend.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class ReviewResponse {

    private Long reviewId;
    private Long userId;
    private String userDisplayName;
    private Integer rating;
    private String text;
    private LocalDateTime createdAt;
    private Long eventId;
}
