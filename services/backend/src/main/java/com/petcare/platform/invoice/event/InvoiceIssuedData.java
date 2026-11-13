package com.petcare.platform.invoice.event;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record InvoiceIssuedData(
        UUID invoiceId,
        String invoiceNumber,
        UUID bookingId,
        UUID customerId,
        BigDecimal totalAmount,
        String currency,
        Instant issuedAt
) {}