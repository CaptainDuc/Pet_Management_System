package com.petcare.platform.loyalty.controller;

import com.petcare.platform.common.dto.ApiResponse;
import com.petcare.platform.common.security.SecurityUtils;
import com.petcare.platform.loyalty.domain.LoyaltyAccount;
import com.petcare.platform.loyalty.service.LoyaltyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/loyalty")
@RequiredArgsConstructor
@Tag(name = "Loyalty", description = "Points balance for the current user")
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
}