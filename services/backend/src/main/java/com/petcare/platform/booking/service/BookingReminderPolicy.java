package com.petcare.platform.booking.service;

import java.time.Instant;

final class BookingReminderPolicy {
    private BookingReminderPolicy() {}

    static boolean due24Hours(Instant appointmentStart, Instant now) {
        return appointmentStart != null
                && appointmentStart.isAfter(now.plusSeconds(30 * 60L))
                && !appointmentStart.isAfter(now.plusSeconds(24 * 60 * 60L));
    }

    static boolean due30Minutes(Instant appointmentStart, Instant now) {
        return appointmentStart != null
                && appointmentStart.isAfter(now)
                && !appointmentStart.isAfter(now.plusSeconds(30 * 60L));
    }
}
