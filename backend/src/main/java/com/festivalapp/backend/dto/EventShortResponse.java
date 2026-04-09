package com.festivalapp.backend.dto;

import com.festivalapp.backend.entity.EventStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
public class EventShortResponse {

    private Long id;
    private String title;
    private String shortDescription;
    private Integer ageRating;
    private LocalDateTime createdAt;
    private EventStatus status;
    private String organizationName;
    private Long venueId;
    private String venueName;
    private String venueAddress;
    private Long cityId;
    private String cityName;
    private List<CategoryResponse> categories;
    private LocalDateTime nextSessionAt;
    private List<LocalDateTime> sessionDates;
    private String coverUrl;
}
