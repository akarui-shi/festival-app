package com.festivalapp.backend.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class SessionShortResponse {

    private Long id;
    private String title;
    private String description;
    private LocalDateTime startAt;
    private LocalDateTime endAt;
    private Long eventId;
    private String eventTitle;
    private Long venueId;
    private String venueName;
    private String cityName;
    private Integer availableSeats;
    private Integer totalCapacity;
}
