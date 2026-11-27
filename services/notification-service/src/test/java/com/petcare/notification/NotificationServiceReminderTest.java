package com.petcare.notification;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.petcare.notification.domain.Notification;
import com.petcare.notification.repository.NotificationRepository;
import com.petcare.notification.service.NotificationService;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.assertj.core.api.Assertions.assertThat;

class NotificationServiceReminderTest {
    private final NotificationRepository repository = mock(NotificationRepository.class);
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final NotificationService service = new NotificationService(repository, jdbc, new ObjectMapper());

    @Test
    void createsCustomerReminderForThirtyMinutesBeforeAppointment() {
        when(jdbc.update(any(String.class), any(Object[].class))).thenReturn(1);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("customerId", UUID.randomUUID());
        data.put("bookingId", UUID.randomUUID());
        data.put("startTime", "2026-11-25T10:30:00Z");
        data.put("serviceNames", List.of("Khám tổng quát"));
        service.handleBookingEvent(Map.of("eventId", UUID.randomUUID(), "eventType", "booking.reminder-30m", "data", data));

        var saved = org.mockito.ArgumentCaptor.forClass(Notification.class);
        verify(repository).saveAndFlush(saved.capture());
        assertThat(saved.getValue().getTitle()).isEqualTo("Lịch hẹn sắp bắt đầu");
        assertThat(saved.getValue().getBody()).contains("Khám tổng quát", "30 phút");
    }

    @Test
    void queuesEmailOnlyForTwentyFourHourReminder() {
        when(jdbc.update(any(String.class), any(Object[].class))).thenReturn(1);
        UUID notificationId = UUID.randomUUID();
        when(repository.saveAndFlush(any(Notification.class))).thenAnswer(call -> {
            Notification notification = call.getArgument(0);
            notification.setId(notificationId);
            return notification;
        });
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("customerId", UUID.randomUUID());
        data.put("bookingId", UUID.randomUUID());
        data.put("customerEmail", "customer@example.com");
        data.put("startTime", "2026-11-28T10:30:00Z");
        data.put("serviceNames", List.of("Khám tổng quát"));
        service.handleBookingEvent(Map.of("eventId", UUID.randomUUID(),
                "eventType", "booking.reminder-24h", "data", data));

        verify(jdbc).update(org.mockito.ArgumentMatchers.contains("insert into notification_deliveries"),
                org.mockito.ArgumentMatchers.eq(notificationId), org.mockito.ArgumentMatchers.eq("customer@example.com"));
    }

    @Test
    void changingAppointmentCancelsEmailStillWaitingToSend() {
        when(jdbc.update(any(String.class), any(Object[].class))).thenReturn(1);
        UUID bookingId = UUID.randomUUID();
        service.handleBookingEvent(Map.of("eventId", UUID.randomUUID(), "eventType", "booking.rescheduled",
                "data", Map.of("customerId", UUID.randomUUID(), "bookingId", bookingId,
                        "startTime", "2026-11-28T10:30:00Z", "serviceNames", List.of("Khám tổng quát"))));

        verify(jdbc).update(org.mockito.ArgumentMatchers.contains("Appointment changed"),
                org.mockito.ArgumentMatchers.eq(bookingId));
    }
}
