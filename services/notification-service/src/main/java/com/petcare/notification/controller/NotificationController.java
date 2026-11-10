package com.petcare.notification.controller;

import com.petcare.notification.dto.ApiResponse;
import com.petcare.notification.dto.NotificationPage;
import com.petcare.notification.dto.NotificationResponse;
import com.petcare.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public ApiResponse<NotificationPage> list(
            @RequestAttribute("userId") UUID userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(notificationService.list(userId, page, size));
    }

    @GetMapping("/unread-count")
    public ApiResponse<Map<String, Long>> unreadCount(@RequestAttribute("userId") UUID userId) {
        return ApiResponse.ok(Map.of("count", notificationService.unreadCount(userId)));
    }

    @PostMapping("/{id}/read")
    public ApiResponse<NotificationResponse> markRead(
            @RequestAttribute("userId") UUID userId, @PathVariable UUID id) {
        return ApiResponse.ok(notificationService.markRead(userId, id));
    }

    @PostMapping("/read-all")
    public ApiResponse<Map<String, Integer>> markAllRead(@RequestAttribute("userId") UUID userId) {
        return ApiResponse.ok(Map.of("updated", notificationService.markAllRead(userId)));
    }
}