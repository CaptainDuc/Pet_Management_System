package com.petcare.platform.schedule.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

public record ScheduleResponse(
        UUID id,
        UUID staffId,
        LocalDate workDate,
        LocalTime startTime,
        LocalTime endTime,
        boolean isAvailable,
        Instant createdAt,
        Instant updatedAt
) {}