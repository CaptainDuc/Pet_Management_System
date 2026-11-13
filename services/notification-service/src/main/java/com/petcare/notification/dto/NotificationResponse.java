package com.petcare.notification.dto;

import java.time.Instant;
import java.util.UUID;

public record NotificationResponse(
        UUID id,
        String type,
        String title,
        String body,
        UUID appointmentId,
        boolean isRead,
        Instant createdAt
) {}