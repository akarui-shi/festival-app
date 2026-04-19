package com.festivalapp.backend.dto;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
public class OrganizerEventTicketsRequest {

    private Boolean freeEvent;

    private List<SessionTicketsItem> sessionTickets;

    @Getter
    @Setter
    public static class SessionTicketsItem {
        private Long sessionId;
        private List<TicketTypeItem> ticketTypes;
    }

    @Getter
    @Setter
    public static class TicketTypeItem {
        private Long id;
        private String name;
        private BigDecimal price;
        private String currency;
        private Integer quota;
        private LocalDateTime salesStartAt;
        private LocalDateTime salesEndAt;
    }
}
