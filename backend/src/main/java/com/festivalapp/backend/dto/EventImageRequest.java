package com.festivalapp.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class EventImageRequest {

    @NotBlank(message = "Image URL is required")
    private String imageUrl;

    private Boolean isCover;

    private Integer sortOrder;
}
