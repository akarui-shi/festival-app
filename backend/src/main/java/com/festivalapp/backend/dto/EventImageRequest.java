package com.festivalapp.backend.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class EventImageRequest {

    private Long imageId;

    private Boolean isCover;

    private Integer sortOrder;
}
