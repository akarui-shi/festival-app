package com.festivalapp.backend.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
public class OrganizerEventWizardResponse {

    private Long eventId;
    private String status;
    private String moderationStatus;
    private Boolean free;

    private Long organizationId;
    private String organizationName;
    private Long cityId;
    private String cityName;

    private String title;
    private String shortDescription;
    private String fullDescription;
    private String ageRestriction;

    private List<Long> categoryIds;
    private List<CategoryResponse> categories;
    private List<ImageItem> images;
    private List<ArtistItem> artists;
    private List<SessionItem> sessions;

    private List<OrganizerEventWizardValidationIssue> validationIssues;
    private boolean readyForModeration;

    @Getter
    @Builder
    public static class ImageItem {
        private Long eventImageId;
        private Long imageId;
        private Boolean primary;
        private Integer sortOrder;
    }

    @Getter
    @Builder
    public static class ArtistItem {
        private Long artistId;
        private String name;
        private String stageName;
        private String description;
        private String genre;
        private Long imageId;
        private String eventRole;
        private Integer displayOrder;
    }

    @Getter
    @Builder
    public static class SessionItem {
        private Long sessionId;
        private String sessionTitle;
        private LocalDateTime startsAt;
        private LocalDateTime endsAt;
        private Long venueId;
        private String venueName;
        private String manualAddress;
        private Long cityId;
        private String cityName;
        private String cityRegion;
        private BigDecimal latitude;
        private BigDecimal longitude;
        private Integer seatLimit;
        private String status;
        private List<TicketTypeItem> ticketTypes;
    }

    @Getter
    @Builder
    public static class TicketTypeItem {
        private Long id;
        private String name;
        private BigDecimal price;
        private String currency;
        private Integer quota;
        private LocalDateTime salesStartAt;
        private LocalDateTime salesEndAt;
    }
}
