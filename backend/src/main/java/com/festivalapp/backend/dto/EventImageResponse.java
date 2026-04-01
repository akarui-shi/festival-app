package com.festivalapp.backend.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class EventImageResponse {

    private Long id;
    private String imageUrl;
    private boolean isCover;
    private Integer sortOrder;
}
