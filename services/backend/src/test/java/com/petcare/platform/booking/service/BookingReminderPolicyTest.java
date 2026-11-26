package com.petcare.platform.booking.service;

import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class BookingReminderPolicyTest {
    private static final Instant NOW = Instant.parse("2026-11-25T10:00:00Z");

    @Test
    void remindersAreSentOnceTheirLeadWindowBeginsButBeforeTheAppointment() {
        assertThat(BookingReminderPolicy.due24Hours(NOW.plusSeconds(24 * 60 * 60L), NOW)).isTrue();
        assertThat(BookingReminderPolicy.due24Hours(NOW.plusSeconds(23 * 60 * 60L), NOW)).isTrue();
        assertThat(BookingReminderPolicy.due24Hours(NOW.plusSeconds(29 * 60L), NOW)).isFalse();
        assertThat(BookingReminderPolicy.due30Minutes(NOW.plusSeconds(30 * 60L), NOW)).isTrue();
        assertThat(BookingReminderPolicy.due30Minutes(NOW.plusSeconds(1), NOW)).isTrue();
        assertThat(BookingReminderPolicy.due30Minutes(NOW, NOW)).isFalse();
    }
}
