package com.petcare.platform.promotion.dto;

import com.petcare.platform.promotion.domain.DiscountType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

@Schema(description = "Yêu cầu tạo mã khuyến mãi mới")
public record CreatePromotionRequest(
        @NotBlank(message = "Mã khuyến mãi không được để trống")
        @Size(max = 50, message = "Mã khuyến mãi tối đa 50 ký tự")
        String code,

        @NotBlank(message = "Tên chương trình khuyến mãi không được để trống")
        @Size(max = 255, message = "Tên chương trình tối đa 255 ký tự")
        String name,

        @NotNull(message = "Loại giảm giá không được để trống")
        DiscountType discountType,

        @NotNull(message = "Giá trị giảm không được để trống")
        @DecimalMin(value = "0.01", message = "Giá trị giảm phải lớn hơn 0")
        BigDecimal discountValue,

        BigDecimal minOrderAmount,
        Integer maxUses,
        LocalDate startDate,
        LocalDate endDate,
        Boolean active
) {
}
