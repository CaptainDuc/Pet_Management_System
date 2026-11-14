package com.petcare.platform.promotion.dto;

import java.math.BigDecimal;

public record PromotionValidationResponse(
        boolean valid,
        String code,
        String discountType,
        BigDecimal discountValue,
        BigDecimal bookingTotal,
        BigDecimal discountAmount,
        BigDecimal finalAmount,
        String reason,
        String message
) {
}
