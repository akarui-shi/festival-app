package com.festivalapp.backend.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
public class OrganizerEventStatsResponse {

    private Long eventId;
    private long registrationsCount;
    private long cancellationsCount;
    private int occupiedSeats;
    private int totalCapacity;
    private int occupancyPercent;
    private List<SessionStats> sessions;

    @Getter
    @Builder
    public static class SessionStats {
        private Long sessionId;
        private LocalDateTime startAt;
        private LocalDateTime endAt;
        private Integer capacity;
        private int occupiedSeats;
        private int occupancyPercent;
    }
}
