package com.petcare.platform.schedule.service;

import com.petcare.platform.schedule.domain.TimeSlot;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/** One service occupies complete consecutive slots in the same schedule/resource. */
public final class SlotWindow {
    private SlotWindow() {}

    // ponytail: schedules cap at 200 slots; index start times if that limit grows.
    public static List<TimeSlot> covering(List<TimeSlot> ordered, TimeSlot first, int minutes) {
        if (minutes <= 0) return List.of();
        Instant cursor = first.getStartTime();
        Instant end = cursor.plus(minutes, ChronoUnit.MINUTES);
        List<TimeSlot> result = new ArrayList<>();
        for (TimeSlot slot : ordered) {
            if (slot.getStartTime().isBefore(first.getStartTime())) continue;
            if (result.isEmpty() && !slot.getId().equals(first.getId())) continue;
            if (!slot.getStartTime().equals(cursor)
                    || !Objects.equals(slot.getScheduleId(), first.getScheduleId())
                    || !Objects.equals(slot.getResourceId(), first.getResourceId())
                    || !slot.getEndTime().isAfter(cursor) || slot.getEndTime().isAfter(end)) {
                return List.of();
            }
            result.add(slot);
            cursor = slot.getEndTime();
            if (cursor.equals(end)) return List.copyOf(result);
        }
        return List.of();
    }
}
