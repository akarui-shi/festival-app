package com.festivalapp.backend.dto;

import lombok.Getter;
import lombok.Setter;
import jakarta.validation.constraints.Positive;

import java.time.LocalDateTime;

@Getter
@Setter
public class SessionUpdateRequest {

    private Long eventId;

    private LocalDateTime startAt;

    private LocalDateTime endAt;

    @Positive(message = "Capacity must be greater than 0")
    private Integer capacity;
}
