package com.festivalapp.backend.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Builder
public class SessionDetailsResponse {

    private Long id;
    private LocalDateTime startAt;
    private LocalDateTime endAt;
    private Integer availableSeats;
    private Integer totalCapacity;
    private EventInfo event;
    private VenueInfo venue;

    @Getter
    @Builder
    public static class EventInfo {
        private Long id;
        private String title;
        private Long organizerId;
        private String organizerName;
    }

    @Getter
    @Builder
    public static class VenueInfo {
        private Long id;
        private String name;
        private String address;
        private String cityName;
        private Integer capacity;
        private BigDecimal latitude;
        private BigDecimal longitude;
    }
}
