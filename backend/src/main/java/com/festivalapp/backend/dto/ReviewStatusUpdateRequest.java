package com.festivalapp.backend.dto;

import com.festivalapp.backend.entity.ReviewStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ReviewStatusUpdateRequest {

    @NotNull(message = "Status is required")
    private ReviewStatus status;
}
