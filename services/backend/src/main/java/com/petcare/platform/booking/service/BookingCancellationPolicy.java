package com.petcare.platform.booking.service;

import java.time.Duration;
import java.time.Instant;

final class BookingCancellationPolicy {
    private static final Duration CUTOFF = Duration.ofMinutes(30);

    private BookingCancellationPolicy() {}

    static boolean canCustomerCancel(Instant appointmentStart, Instant now) {
        return appointmentStart != null && !appointmentStart.isBefore(now.plus(CUTOFF));
    }
}
