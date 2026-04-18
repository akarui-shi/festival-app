package com.festivalapp.backend.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PaymentConfirmRequest {

    private String externalPaymentId;

    private String status;
}
