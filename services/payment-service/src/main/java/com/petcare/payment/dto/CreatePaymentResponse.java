package com.petcare.payment.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record CreatePaymentResponse(
        String orderCode,
        UUID bookingId,
        UUID invoiceId,
        BigDecimal amount,
        String status,
        BankInfo bankInfo,
        String qrUrl,
        Instant createdAt
) {
    public record BankInfo(String bankCode, String accountNumber, String accountName) {
    }
}
