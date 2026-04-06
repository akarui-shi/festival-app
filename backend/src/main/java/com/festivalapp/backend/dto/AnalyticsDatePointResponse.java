package com.festivalapp.backend.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;

@Getter
@Builder
public class AnalyticsDatePointResponse {

    private LocalDate date;
    private long value;
}
