package com.petcare.platform.invoice.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record InvoiceResponse(
        UUID id,
        UUID bookingId,
        String invoiceNumber,
        String status,
        BigDecimal totalAmount,
        String currency,
        Instant issuedAt,
        List<ItemResponse> items
) {
    public record ItemResponse(String description, int quantity, BigDecimal unitPrice, BigDecimal subtotal) {}
}