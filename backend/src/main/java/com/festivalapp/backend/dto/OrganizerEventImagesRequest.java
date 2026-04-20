package com.festivalapp.backend.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class OrganizerEventImagesRequest {

    private List<ImageItem> images;

    @Getter
    @Setter
    public static class ImageItem {
        private Long imageId;
        private Boolean primary;
        private Integer sortOrder;
    }
}
