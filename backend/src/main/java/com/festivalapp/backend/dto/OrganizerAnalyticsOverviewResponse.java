package com.festivalapp.backend.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.util.List;

@Getter
@Builder
public class OrganizerAnalyticsOverviewResponse {

    private LocalDate fromDate;
    private LocalDate toDate;

    private OverviewKpi kpi;

    private List<AnalyticsDatePointResponse> visitsByDay;
    private List<AnalyticsDatePointResponse> registrationsByDay;
    private List<AnalyticsTrafficSourceResponse> trafficSources;
    private List<AnalyticsSessionLoadResponse> sessionLoads;

    private YandexMetrikaStatusResponse metrika;

    @Getter
    @Builder
    public static class OverviewKpi {
        private long pageViews;
        private long uniqueVisitors;
        private long registrations;
        private int activeParticipants;
        private long favorites;
        private double averageRating;
    }
}
