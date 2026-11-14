package com.petcare.platform.common.internal;

import java.math.BigDecimal;
import java.util.UUID;

public record PayableResponse(
        UUID bookingId,
        UUID invoiceId,
        String reference,
        BigDecimal amount,
        String paymentStatus,
        boolean alreadyPaid
) {
}
