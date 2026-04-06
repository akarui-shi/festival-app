package com.festivalapp.backend.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class OrganizerEventEngagementResponse {

    private Long eventId;
    private String eventTitle;
    private String eventPath;

    private long registrationsCount;
    private long cancellationsCount;
    private long activeRegistrations;
    private int activeParticipants;

    private int sessionsCount;
    private int averageSessionOccupancyPercent;

    private long favoritesCount;
    private long reviewsCount;
    private double averageRating;

    private List<AnalyticsDatePointResponse> registrationsByDay;
    private List<AnalyticsSessionLoadResponse> sessionLoads;
}
