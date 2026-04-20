package com.festivalapp.backend.dto;

import com.festivalapp.backend.entity.PublicationStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
public class PublicationShortResponse {

    private Long publicationId;
    private String title;
    private String preview;
    private LocalDateTime createdAt;
    private LocalDateTime publishedAt;
    private PublicationStatus status;
    private String moderationStatus;
    private String authorName;
    private Long imageId;
    private List<Long> imageIds;
    private Long organizationId;
    private String organizationName;
    private Long eventId;
    private String eventTitle;
    private Long eventImageId;
}
