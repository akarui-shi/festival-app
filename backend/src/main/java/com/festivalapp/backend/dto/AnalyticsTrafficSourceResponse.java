package com.festivalapp.backend.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class AnalyticsTrafficSourceResponse {

    private String source;
    private long visits;
    private double sharePercent;
}
