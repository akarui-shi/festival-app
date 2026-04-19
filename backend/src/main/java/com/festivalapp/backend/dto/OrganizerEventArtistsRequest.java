package com.festivalapp.backend.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class OrganizerEventArtistsRequest {

    private List<ExistingArtistItem> artists;

    @Getter
    @Setter
    public static class ExistingArtistItem {
        private Long artistId;
        private String eventRole;
        private Integer displayOrder;
    }
}
