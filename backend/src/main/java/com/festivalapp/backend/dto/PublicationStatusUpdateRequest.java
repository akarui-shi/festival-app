package com.festivalapp.backend.dto;

import com.festivalapp.backend.entity.PublicationStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PublicationStatusUpdateRequest {

    @NotNull(message = "Status is required")
    private PublicationStatus status;
}
