package com.petcare.platform.promotion.controller;

import com.petcare.platform.common.dto.ApiResponse;
import com.petcare.platform.promotion.dto.PromotionValidationRequest;
import com.petcare.platform.promotion.dto.PromotionValidationResponse;
import com.petcare.platform.promotion.service.PromotionService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/promotions")
@RequiredArgsConstructor
@Tag(name = "Promotions", description = "Kiểm tra mã giảm giá")
public class PromotionController {

    private final PromotionService promotionService;

    @PostMapping("/validate")
    public ResponseEntity<ApiResponse<PromotionValidationResponse>> validate(
            @Valid @RequestBody PromotionValidationRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                promotionService.validate(request.code(), request.bookingTotal())));
    }
}
