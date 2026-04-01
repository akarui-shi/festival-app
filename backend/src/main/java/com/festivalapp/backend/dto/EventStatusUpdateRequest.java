package com.festivalapp.backend.dto;

import com.festivalapp.backend.entity.EventStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class EventStatusUpdateRequest {

    @NotNull(message = "Status is required")
    private EventStatus status;
}
