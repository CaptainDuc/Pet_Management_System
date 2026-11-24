package com.petcare.platform.analytics.controller;

import com.petcare.platform.common.dto.ApiResponse;
import com.petcare.platform.analytics.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import org.springframework.security.access.prepost.PreAuthorize;

@RestController
@RequestMapping("/api/v1/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyRole('OWNER','ADMIN')")
    public ApiResponse<AnalyticsService.Dashboard> getStats() {
        return ApiResponse.ok(analyticsService.getDashboardStats());
    }
}
