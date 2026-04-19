package com.festivalapp.backend.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class EventImageRequest {

    private Long imageId;

    private String imageUrl;

    private Boolean isCover;

    private Integer sortOrder;
}
