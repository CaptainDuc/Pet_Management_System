package com.petcare.payment.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record CreatePaymentRequest(
        BigDecimal amount,
        UUID bookingId,
        UUID invoiceId,
        String invoiceCode,
        String description
) {
}
