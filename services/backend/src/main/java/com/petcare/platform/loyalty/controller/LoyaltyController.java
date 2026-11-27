package com.petcare.platform.loyalty.controller;

import com.petcare.platform.common.dto.ApiResponse;
import com.petcare.platform.common.security.SecurityUtils;
import com.petcare.platform.loyalty.domain.LoyaltyAccount;
import com.petcare.platform.loyalty.dto.AdjustPointsRequest;
import com.petcare.platform.loyalty.service.LoyaltyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/loyalty")
@RequiredArgsConstructor
@Tag(name = "Loyalty", description = "Points balance and tier benefits for customers")
public class LoyaltyController {

    private final LoyaltyService loyaltyService;

    /**
     * Points balance of the signed-in user. No path parameter, so there is no IDOR
     * surface.
     */
    @GetMapping("/me")
    @Operation(summary = "Get the loyalty account of the current user")
    public ApiResponse<LoyaltyAccount> getMyAccount() {
        return ApiResponse.ok(loyaltyService.getOrCreateAccount(SecurityUtils.requireCurrentUserId()));
    }

    /**
     * Points balance of another user.
     *
     * <p>Previously this returned any customer's points to any authenticated
     * caller. Access is now limited to the owner of the account or an ADMIN.
     */
    @GetMapping("/customer/{customerId}")
    @Operation(summary = "Get a loyalty account (own account, or any account for ADMIN)")
    public ApiResponse<LoyaltyAccount> getCustomerAccount(@PathVariable UUID customerId) {
        if (!customerId.equals(SecurityUtils.requireCurrentUserId()) && !SecurityUtils.hasRole("ADMIN")) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Not allowed to read the loyalty account of another user");
        }
        return ApiResponse.ok(loyaltyService.getAccountByUser(customerId));
    }

    /**
     * Admin endpoint to adjust points for any customer.
     * Requires ADMIN role.
     */
    @PostMapping("/adjust")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Adjust loyalty points for a customer (ADMIN only)")
    public ApiResponse<LoyaltyAccount> adjustPoints(@Valid @RequestBody AdjustPointsRequest request) {
        return ApiResponse.ok(loyaltyService.adjustPoints(request.userId(), request.pointsDelta(), request.reason()));
    }

    /**
     * Get all tier configurations with benefits
     */
    @GetMapping("/tiers")
    @Operation(summary = "Get all loyalty tier configurations")
    public ApiResponse<List<Map<String, Object>>> getTiers() {
        return ApiResponse.ok(loyaltyService.getTierBenefits());
    }

    /**
     * Get discount percentage for current user's tier
     */
    @GetMapping("/discount")
    @Operation(summary = "Get discount percentage for current user's tier")
    public ApiResponse<Map<String, Object>> getMyDiscount() {
        UUID userId = SecurityUtils.requireCurrentUserId();
        LoyaltyAccount account = loyaltyService.getOrCreateAccount(userId);
        int discount = loyaltyService.getDiscountPercent(account.getTier());
        return ApiResponse.ok(Map.of(
                "tier", account.getTier(),
                "discountPercent", discount,
                "points", account.getPoints(),
                "lifetimePoints", account.getLifetimePoints()
        ));
    }

    @GetMapping("/customer/{customerId}/discount")
    @PreAuthorize("hasAnyRole('ADMIN', 'OWNER', 'STAFF')")
    public ApiResponse<Map<String, Object>> getCustomerDiscount(@PathVariable UUID customerId) {
        LoyaltyAccount account = loyaltyService.getOrCreateAccount(customerId);
        return ApiResponse.ok(Map.of(
                "tier", account.getTier(),
                "discountPercent", loyaltyService.getDiscountPercent(account.getTier())
        ));
    }

    /**
     * Get next tier info for progress display
     */
    @GetMapping("/next-tier")
    @Operation(summary = "Get next tier info for current user")
    public ApiResponse<Map<String, Object>> getNextTier() {
        UUID userId = SecurityUtils.requireCurrentUserId();
        LoyaltyAccount account = loyaltyService.getOrCreateAccount(userId);
        var nextTier = loyaltyService.getNextTier(account.getTier());
        if (nextTier == null) {
            return ApiResponse.ok(Map.of("maxTierReached", true));
        }
        return ApiResponse.ok(Map.of(
                "nextTier", nextTier.name(),
                "nextTierPoints", nextTier.minPoints(),
                "currentPoints", account.getPoints(),
                "progressPercent", Math.min(100, (account.getPoints() * 100) / nextTier.minPoints())
        ));
    }
}
