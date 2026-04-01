package com.festivalapp.backend.dto;

import com.festivalapp.backend.entity.EventStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
public class EventDetailsResponse {

    private Long id;
    private String title;
    private String shortDescription;
    private String fullDescription;
    private Integer ageRating;
    private LocalDateTime createdAt;
    private EventStatus status;
    private String coverUrl;
    private List<EventImageResponse> eventImages;
    private OrganizerSummary organizer;
    private VenueResponse venue;
    private List<CategoryResponse> categories;

    @Getter
    @Builder
    public static class OrganizerSummary {
        private Long id;
        private String name;
        private String description;
        private String contacts;
    }
}
