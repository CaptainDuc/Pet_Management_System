package com.petcare.platform.schedule.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Schema(description = "Create a work schedule and generate its time slots")
public record CreateScheduleRequest(
        @NotNull UUID staffId,
        @NotNull LocalDate workDate,
        @NotNull LocalTime startTime,
        @NotNull LocalTime endTime,
        Boolean isAvailable,
        @NotNull @Min(5) @Max(480) Integer slotDurationMinutes
) {}