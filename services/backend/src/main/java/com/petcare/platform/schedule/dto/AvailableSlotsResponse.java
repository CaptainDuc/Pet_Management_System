package com.petcare.platform.schedule.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record AvailableSlotsResponse(
        LocalDate date,
        String timezone,
        List<StaffSlots> staff
) {
    public record StaffSlots(
            UUID staffId,
            UUID scheduleId,
            LocalTime workStart,
            LocalTime workEnd,
            List<SlotView> slots
    ) {}

    public record SlotView(
            UUID slotId,
            OffsetDateTime startTime,
            OffsetDateTime endTime,
            boolean available,
            List<UUID> serviceIds,
            UUID resourceId
    ) {}
}