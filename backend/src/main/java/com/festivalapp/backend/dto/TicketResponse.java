package com.festivalapp.backend.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Builder
public class TicketResponse {

    private Long ticketId;
    private Long orderId;
    private Long eventId;
    private String eventTitle;
    private String eventShortDescription;
    private Long sessionId;
    private String sessionTitle;
    private LocalDateTime sessionStartsAt;
    private LocalDateTime sessionEndsAt;
    private String venueName;
    private String venueAddress;
    private String cityName;
    private String ticketTypeName;
    private BigDecimal ticketPrice;
    private String ticketCurrency;
    private String holderName;
    private String status;
    private String qrToken;
    private LocalDateTime issuedAt;
    private LocalDateTime usedAt;
    private Boolean requiresPayment;
    private String paymentStatus;
    private String paymentUrl;
}
