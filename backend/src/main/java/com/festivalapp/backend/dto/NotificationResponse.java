package com.festivalapp.backend.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.OffsetDateTime;

@Getter
@Builder
public class NotificationResponse {
    private Long id;
    private String type;
    private String title;
    private String body;
    private String link;
    private boolean read;
    private OffsetDateTime createdAt;
}
