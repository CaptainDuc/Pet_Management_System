package com.petcare.platform.analytics.service;

import org.springframework.stereotype.Service;
import java.util.Map;

@Service
public class AnalyticsService {
    public Map<String, Object> getDashboardStats() {
        return Map.of(
                "totalBookings", 0,
                "totalRevenue", 0.0,
                "activePets", 0
        );
    }
}
