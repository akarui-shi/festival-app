package com.festivalapp.backend.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class OrganizerEventParticipantsRequest {

    private List<ExistingParticipantItem> participants;

    @Getter
    @Setter
    public static class ExistingParticipantItem {
        private Long participantId;
    }
}
