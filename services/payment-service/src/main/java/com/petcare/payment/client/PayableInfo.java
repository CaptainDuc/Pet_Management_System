package com.petcare.payment.client;

import java.math.BigDecimal;
import java.util.UUID;

public record PayableInfo(
        UUID bookingId,
        UUID invoiceId,
        String reference,
        BigDecimal amount,
        String paymentStatus,
        boolean alreadyPaid
) {
}
