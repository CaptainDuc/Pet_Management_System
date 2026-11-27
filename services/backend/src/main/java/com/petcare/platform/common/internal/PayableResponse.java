package com.petcare.platform.common.internal;

import java.math.BigDecimal;
import java.util.UUID;

public record PayableResponse(
        UUID bookingId,
        UUID invoiceId,
        String reference,
        BigDecimal amount,
        String paymentStatus,
        boolean alreadyPaid,
        int discountPercent
) {
    // Backward compatibility constructor
    public PayableResponse(UUID bookingId, UUID invoiceId, String reference, BigDecimal amount, String paymentStatus, boolean alreadyPaid) {
        this(bookingId, invoiceId, reference, amount, paymentStatus, alreadyPaid, 0);
    }
}
