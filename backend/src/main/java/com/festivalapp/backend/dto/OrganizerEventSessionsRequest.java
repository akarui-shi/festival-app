package com.festivalapp.backend.dto;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
public class OrganizerEventSessionsRequest {

    private List<SessionItem> sessions;

    @Getter
    @Setter
    public static class SessionItem {
        private Long id;
        private String sessionTitle;
        private LocalDateTime startsAt;
        private LocalDateTime endsAt;
        private Long venueId;
        private String manualAddress;
        private Long cityId;
        private String cityName;
        private String cityRegion;
        private BigDecimal latitude;
        private BigDecimal longitude;
        private Integer seatLimit;
    }
}
