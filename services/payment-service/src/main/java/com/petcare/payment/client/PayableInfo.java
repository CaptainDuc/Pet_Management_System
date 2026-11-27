package com.petcare.payment.client;

import java.math.BigDecimal;
import java.util.UUID;

public record PayableInfo(
        UUID bookingId,
        UUID invoiceId,
        String reference,
        BigDecimal amount,
        String paymentStatus,
        boolean alreadyPaid,
        int discountPercent
) {
    // Backward compatibility
    public PayableInfo(UUID bookingId, UUID invoiceId, String reference, BigDecimal amount, String paymentStatus, boolean alreadyPaid) {
        this(bookingId, invoiceId, reference, amount, paymentStatus, alreadyPaid, 0);
    }

    public BigDecimal discountedAmount() {
        if (discountPercent <= 0) return amount;
        BigDecimal discount = amount.multiply(BigDecimal.valueOf(discountPercent)).divide(BigDecimal.valueOf(100));
        return amount.subtract(discount).max(BigDecimal.ZERO);
    }
}
