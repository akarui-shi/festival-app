package com.festivalapp.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class SessionCreateRequest {

    @NotNull(message = "Event ID is required")
    private Long eventId;

    // Deprecated: venue is defined on event level. Kept for backward compatibility.
    private Long venueId;

    @NotBlank(message = "Title is required")
    @Size(max = 255, message = "Title is too long")
    private String title;

    private String description;

    @NotNull(message = "Start time is required")
    private LocalDateTime startAt;

    @NotNull(message = "End time is required")
    private LocalDateTime endAt;
}
