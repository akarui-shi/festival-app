package com.festivalapp.backend.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.OffsetDateTime;

@Getter
@Builder
public class WaitlistEntryResponse {
    private Long id;
    private String userFullName;
    private Long userAvatarImageId;
    private Long sessionId;
    private String sessionLabel;
    private long position;
    private String status;
    private OffsetDateTime joinedAt;
}
