package com.festivalapp.backend.dto;

import com.festivalapp.backend.entity.EventStatus;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class FavoriteResponse {

    private Long eventId;
    private String title;
    private String shortDescription;
    private Long coverImageId;
    private Integer ageRating;
    private EventStatus status;
}
