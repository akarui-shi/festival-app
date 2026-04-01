package com.festivalapp.backend.dto;

import com.festivalapp.backend.entity.ReviewStatus;
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
    private ReviewStatus status;
    private Long eventId;
}
