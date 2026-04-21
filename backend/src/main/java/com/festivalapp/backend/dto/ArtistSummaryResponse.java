package com.festivalapp.backend.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class ArtistSummaryResponse {

    private Long id;
    private String name;
    private String stageName;
    private String description;
    private String genre;
    private Long imageId;
    private List<Long> imageIds;
    private Long primaryImageId;
}
