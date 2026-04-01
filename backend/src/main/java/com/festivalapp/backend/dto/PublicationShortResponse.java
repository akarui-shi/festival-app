package com.festivalapp.backend.dto;

import com.festivalapp.backend.entity.PublicationStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class PublicationShortResponse {

    private Long publicationId;
    private String title;
    private String preview;
    private LocalDateTime createdAt;
    private PublicationStatus status;
    private String authorName;
    private String imageUrl;
    private Long eventId;
    private String eventTitle;
}
