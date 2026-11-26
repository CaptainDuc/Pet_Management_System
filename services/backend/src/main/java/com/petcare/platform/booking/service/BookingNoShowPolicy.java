package com.petcare.platform.booking.service;

import com.petcare.platform.booking.domain.BookingStatus;

import java.time.Instant;

final class BookingNoShowPolicy {
    private BookingNoShowPolicy() {}

    static boolean canMarkNoShow(BookingStatus status, Instant appointmentStart, Instant now) {
        return status == BookingStatus.CONFIRMED
                && appointmentStart != null
                && !appointmentStart.isAfter(now);
    }
}
