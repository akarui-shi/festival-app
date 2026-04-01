package com.festivalapp.backend.dto;

import com.festivalapp.backend.entity.PublicationStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class PublicationDetailsResponse {

    private Long publicationId;
    private String title;
    private String content;
    private String imageUrl;
    private LocalDateTime createdAt;
    private PublicationStatus status;
    private String authorName;
    private Long authorId;
    private Long eventId;
    private String eventTitle;
}
