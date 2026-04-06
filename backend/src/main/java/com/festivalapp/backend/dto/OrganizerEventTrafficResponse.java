package com.festivalapp.backend.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class OrganizerEventTrafficResponse {

    private Long eventId;
    private String eventPath;

    private long pageViews;
    private long uniqueVisitors;
    private Double bounceRate;
    private Double pageDepth;

    private List<AnalyticsTrafficSourceResponse> trafficSources;
    private List<AnalyticsDatePointResponse> visitsByDay;

    private YandexMetrikaStatusResponse metrika;
}
