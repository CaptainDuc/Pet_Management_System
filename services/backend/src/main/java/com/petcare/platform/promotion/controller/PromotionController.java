package com.petcare.platform.promotion.controller;

import com.petcare.platform.common.dto.ApiResponse;
import com.petcare.platform.promotion.dto.CreatePromotionRequest;
import com.petcare.platform.promotion.dto.PromotionResponse;
import com.petcare.platform.promotion.dto.PromotionValidationRequest;
import com.petcare.platform.promotion.dto.PromotionValidationResponse;
import com.petcare.platform.promotion.dto.UpdatePromotionRequest;
import com.petcare.platform.promotion.service.PromotionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/promotions")
@RequiredArgsConstructor
@Tag(name = "Promotions", description = "Quản lý & kiểm tra mã giảm giá khuyến mãi")
public class PromotionController {

    private final PromotionService promotionService;

    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'STAFF')")
    @Operation(summary = "Lấy danh sách tất cả mã khuyến mãi")
    public ResponseEntity<ApiResponse<List<PromotionResponse>>> getAllPromotions() {
        return ResponseEntity.ok(ApiResponse.ok(promotionService.findAll()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'STAFF')")
    @Operation(summary = "Xem chi tiết một mã khuyến mãi")
    public ResponseEntity<ApiResponse<PromotionResponse>> getPromotionById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(promotionService.findById(id)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Tạo mới mã khuyến mãi")
    public ResponseEntity<ApiResponse<PromotionResponse>> createPromotion(
            @Valid @RequestBody CreatePromotionRequest request) {
        PromotionResponse response = promotionService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Cập nhật mã khuyến mãi")
    public ResponseEntity<ApiResponse<PromotionResponse>> updatePromotion(
            @PathVariable UUID id,
            @Valid @RequestBody UpdatePromotionRequest request) {
        PromotionResponse response = promotionService.update(id, request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PatchMapping("/{id}/toggle")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Bật/Tắt trạng thái hoạt động mã khuyến mãi")
    public ResponseEntity<ApiResponse<PromotionResponse>> togglePromotion(@PathVariable UUID id) {
        PromotionResponse response = promotionService.toggleActive(id);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    @Operation(summary = "Xóa mã khuyến mãi")
    public ResponseEntity<ApiResponse<Void>> deletePromotion(@PathVariable UUID id) {
        promotionService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @PostMapping("/validate")
    @Operation(summary = "Kiểm tra tính hợp lệ của mã khuyến mãi khi đặt lịch")
    public ResponseEntity<ApiResponse<PromotionValidationResponse>> validate(
            @Valid @RequestBody PromotionValidationRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                promotionService.validate(request.code(), request.bookingTotal())));
    }
}
