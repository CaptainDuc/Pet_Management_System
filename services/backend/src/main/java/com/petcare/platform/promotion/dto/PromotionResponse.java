package com.petcare.platform.promotion.dto;

import com.petcare.platform.promotion.domain.DiscountType;
import com.petcare.platform.promotion.domain.Promotion;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Schema(description = "Thông tin chi tiết mã khuyến mãi")
public record PromotionResponse(
        UUID id,
        String code,
        String name,
        DiscountType discountType,
        BigDecimal discountValue,
        BigDecimal minOrderAmount,
        Integer maxUses,
        Integer usedCount,
        LocalDate startDate,
        LocalDate endDate,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {
    public static PromotionResponse from(Promotion promotion) {
        return new PromotionResponse(
                promotion.getId(),
                promotion.getCode(),
                promotion.getName(),
                promotion.getDiscountType(),
                promotion.getDiscountValue(),
                promotion.getMinOrderAmount() != null ? promotion.getMinOrderAmount() : BigDecimal.ZERO,
                promotion.getMaxUses(),
                promotion.getUsedCount() != null ? promotion.getUsedCount() : 0,
                promotion.getStartDate(),
                promotion.getEndDate(),
                promotion.isActive(),
                promotion.getCreatedAt(),
                promotion.getUpdatedAt()
        );
    }
}
