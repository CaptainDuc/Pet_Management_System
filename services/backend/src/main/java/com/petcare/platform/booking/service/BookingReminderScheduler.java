package com.petcare.platform.booking.service;

import com.petcare.platform.common.event.RabbitMQQueues;
import com.petcare.platform.common.outbox.OutboxService;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class BookingReminderScheduler {
    private final JdbcClient jdbc;
    private final OutboxService outbox;

    private record Candidate(UUID bookingId, UUID customerId, String customerEmail,
                             Instant startTime, List<String> serviceNames) {}

    @Scheduled(fixedDelayString = "${app.booking.reminder-scan-ms:60000}")
    @Transactional
    public void dispatchDueReminders() {
        Instant now = Instant.now();
        List<Candidate> candidates = jdbc.sql("""
                select b.id as booking_id, b.customer_id, u.email as customer_email, min(t.start_time) as start_time,
                       array_agg(distinct svc.name) as service_names
                from bookings b
                join users u on u.id = b.customer_id
                join booking_items i on i.booking_id = b.id
                join time_slots t on t.id = i.time_slot_id
                join services svc on svc.id = i.service_id
                where b.status = 'CONFIRMED'
                group by b.id, b.customer_id, u.email
                having min(t.start_time) > :now and min(t.start_time) <= :latest
                """)
                .param("now", Timestamp.from(now))
                .param("latest", Timestamp.from(now.plusSeconds(24 * 60 * 60L)))
                .query((rs, row) -> {
                    var sqlArray = rs.getArray("service_names");
                    List<String> names = sqlArray == null ? List.of()
                            : Arrays.asList((String[]) sqlArray.getArray());
                    return new Candidate(rs.getObject("booking_id", UUID.class),
                            rs.getObject("customer_id", UUID.class), rs.getString("customer_email"),
                            rs.getTimestamp("start_time").toInstant(), names);
                }).list();

        for (Candidate candidate : candidates) {
            if (BookingReminderPolicy.due24Hours(candidate.startTime(), now)) {
                dispatch(candidate, now, 1440, RabbitMQQueues.BOOKING_REMINDER_24H);
            }
            if (BookingReminderPolicy.due30Minutes(candidate.startTime(), now)) {
                dispatch(candidate, now, 30, RabbitMQQueues.BOOKING_REMINDER_30M);
            }
        }
    }

    private void dispatch(Candidate candidate, Instant now, int reminderMinutes, String eventType) {
        int claimed = jdbc.sql("""
                insert into booking_reminder_dispatches (booking_id, reminder_minutes, appointment_start)
                values (:bookingId, :reminderMinutes, :appointmentStart)
                on conflict do nothing
                """)
                .param("bookingId", candidate.bookingId())
                .param("reminderMinutes", reminderMinutes)
                .param("appointmentStart", Timestamp.from(candidate.startTime()))
                .update();
        if (claimed == 0) return;

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("bookingId", candidate.bookingId());
        data.put("customerId", candidate.customerId());
        if (reminderMinutes == 1440) data.put("customerEmail", candidate.customerEmail());
        data.put("status", "CONFIRMED");
        data.put("startTime", OffsetDateTime.ofInstant(candidate.startTime(), ZoneOffset.UTC));
        data.put("serviceNames", candidate.serviceNames());
        data.put("reminderMinutes", reminderMinutes);
        outbox.append("Booking", candidate.bookingId(), RabbitMQQueues.BOOKING_EXCHANGE, eventType, data);
    }
}
