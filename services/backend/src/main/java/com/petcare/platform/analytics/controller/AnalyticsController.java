package com.petcare.platform.analytics.controller;

import com.petcare.platform.common.dto.ApiResponse;
import com.petcare.platform.analytics.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/dashboard")
    public ApiResponse<Map<String, Object>> getStats() {
        return ApiResponse.ok(analyticsService.getDashboardStats());
    }
}
