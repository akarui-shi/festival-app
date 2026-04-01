package com.festivalapp.backend.dto;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class SessionUpdateRequest {

    private Long eventId;

    // Deprecated: venue is defined on event level. Kept for backward compatibility.
    private Long venueId;

    @Size(min = 1, max = 255, message = "Title must be between 1 and 255 characters")
    private String title;

    private String description;

    private LocalDateTime startAt;

    private LocalDateTime endAt;
}
