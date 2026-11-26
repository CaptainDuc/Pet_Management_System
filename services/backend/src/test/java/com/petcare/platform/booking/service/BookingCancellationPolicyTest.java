package com.petcare.platform.booking.service;

import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class BookingCancellationPolicyTest {
    private static final Instant NOW = Instant.parse("2026-11-25T10:00:00Z");

    @Test
    void customerMayCancelAtLeastThirtyMinutesBeforeAppointment() {
        assertThat(BookingCancellationPolicy.canCustomerCancel(NOW.plusSeconds(31 * 60L), NOW)).isTrue();
        assertThat(BookingCancellationPolicy.canCustomerCancel(NOW.plusSeconds(30 * 60L), NOW)).isTrue();
        assertThat(BookingCancellationPolicy.canCustomerCancel(NOW.plusSeconds(29 * 60L), NOW)).isFalse();
        assertThat(BookingCancellationPolicy.canCustomerCancel(NOW.minusSeconds(1), NOW)).isFalse();
    }
}
