package com.festivalapp.backend.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class TicketResponse {

    private Long ticketId;
    private Long orderId;
    private Long eventId;
    private String eventTitle;
    private Long sessionId;
    private String sessionTitle;
    private String status;
    private String qrToken;
    private LocalDateTime issuedAt;
    private LocalDateTime usedAt;
    private Boolean requiresPayment;
    private String paymentStatus;
    private String paymentUrl;
}
