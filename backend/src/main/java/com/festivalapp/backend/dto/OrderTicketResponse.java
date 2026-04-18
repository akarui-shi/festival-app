package com.festivalapp.backend.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class OrderTicketResponse {

    private Long ticketId;
    private Long sessionId;
    private String status;
    private String qrToken;
    private LocalDateTime issuedAt;
    private LocalDateTime usedAt;
}
