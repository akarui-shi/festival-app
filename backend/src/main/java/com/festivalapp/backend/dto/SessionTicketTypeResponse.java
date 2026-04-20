package com.festivalapp.backend.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Builder
public class SessionTicketTypeResponse {

    private Long id;
    private String name;
    private BigDecimal price;
    private String currency;
    private Integer quota;
    private Integer availableQuota;
    private Boolean registrationOpen;
    private LocalDateTime salesStartAt;
    private LocalDateTime salesEndAt;
}
