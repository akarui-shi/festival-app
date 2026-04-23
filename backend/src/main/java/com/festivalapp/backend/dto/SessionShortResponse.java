package com.festivalapp.backend.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Builder
public class SessionShortResponse {

    private Long id;
    private String sessionTitle;
    private LocalDateTime startAt;
    private LocalDateTime endAt;
    private Long eventId;
    private String eventTitle;
    private Long venueId;
    private String venueName;
    private String venueAddress;
    private String cityName;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private Integer availableSeats;
    private Integer totalCapacity;
    private String participationType;
    private BigDecimal price;
    private String currency;
    private Boolean registrationOpen;
}
