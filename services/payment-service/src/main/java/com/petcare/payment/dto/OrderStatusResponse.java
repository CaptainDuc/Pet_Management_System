package com.petcare.payment.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record OrderStatusResponse(
        String orderCode,
        String status,
        BigDecimal amount,
        BigDecimal remainingAmount,
        String qrUrl,
        Instant paidAt
) {
}
