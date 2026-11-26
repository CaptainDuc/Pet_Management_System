package com.petcare.platform.booking.service;

import com.petcare.platform.booking.domain.BookingStatus;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class BookingNoShowPolicyTest {
    private static final Instant NOW = Instant.parse("2026-11-25T10:00:00Z");

    @Test
    void onlyConfirmedAppointmentsCanBeMarkedNoShowAfterTheirStart() {
        assertThat(BookingNoShowPolicy.canMarkNoShow(BookingStatus.CONFIRMED, NOW, NOW)).isTrue();
        assertThat(BookingNoShowPolicy.canMarkNoShow(BookingStatus.CONFIRMED, NOW.plusSeconds(1), NOW)).isFalse();
        assertThat(BookingNoShowPolicy.canMarkNoShow(BookingStatus.PENDING, NOW.minusSeconds(1), NOW)).isFalse();
        assertThat(BookingNoShowPolicy.canMarkNoShow(BookingStatus.IN_PROGRESS, NOW.minusSeconds(1), NOW)).isFalse();
    }
}
