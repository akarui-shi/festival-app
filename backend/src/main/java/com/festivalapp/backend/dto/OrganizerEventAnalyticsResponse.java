package com.festivalapp.backend.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class OrganizerEventAnalyticsResponse {

    private OrganizerEventEngagementResponse engagement;
    private OrganizerEventTrafficResponse traffic;
}
