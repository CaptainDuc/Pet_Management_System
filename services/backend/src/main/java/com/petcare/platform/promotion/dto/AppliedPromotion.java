package com.petcare.platform.promotion.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record AppliedPromotion(
        UUID promotionId,
        String code,
        BigDecimal subtotal,
        BigDecimal discountAmount,
        BigDecimal finalAmount
) {
}
