package com.festivalapp.backend.dto;

import com.festivalapp.backend.entity.EventStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class EventResponse {

    private Long id;
    private String title;
    private String shortDescription;
    private String fullDescription;
    private Integer ageRating;
    private EventStatus status;
    private LocalDateTime createdAt;
    private Long organizerId;
}
