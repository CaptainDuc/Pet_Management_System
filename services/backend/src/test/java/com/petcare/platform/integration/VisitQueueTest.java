package com.petcare.platform.integration;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class VisitQueueTest extends IntegrationTestBase {
    private static final String QUEUE = "/api/v1/bookings/queue";
    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private JsonNode call(HttpMethod method, String path, TestUser user, Object body, HttpStatus expected) {
        var result = send(method, path, user.token(), body);
        assertThat(result.getStatusCode()).as(result.getBody()).isEqualTo(expected);
        return json(result).path("data");
    }

    @Test
    void frontDeskAndAssignedCliniciansShareEachServiceAndFinishTheBookingOnce() {
        Scenario s = newScenario("VETERINARIAN");
        Scenario other = newScenario("VETERINARIAN");
        TestUser front = newUser("STAFF");
        var slots = List.of(s.slotIds().getFirst(), other.slotIds().get(1));
        var booking = call(HttpMethod.POST, "/api/v1/bookings", s.customer(), Map.of("petId", s.petId(),
                "items", List.of(Map.of("serviceId", s.serviceId(), "timeSlotId", slots.getFirst()),
                                 Map.of("serviceId", other.serviceId(), "timeSlotId", slots.getLast()))), HttpStatus.CREATED);
        String id = booking.path("id").asText();
        String date = "?date=" + LocalDate.now(ZONE);
        call(HttpMethod.GET, QUEUE + date, s.customer(), null, HttpStatus.FORBIDDEN);
        call(HttpMethod.GET, QUEUE + date, s.staffUser(), null, HttpStatus.FORBIDDEN);
        assertThat(call(HttpMethod.GET, QUEUE + "/mine?date=" + s.date(), s.staffUser(), null, HttpStatus.OK)).isEmpty();
        assignReserved(UUID.fromString(id), front);
        String firstItem = call(HttpMethod.GET, QUEUE + "/mine?date=" + s.date(), s.staffUser(), null, HttpStatus.OK)
                .get(0).path("itemId").asText();
        String first = QUEUE + "/" + id + "/" + firstItem;
        call(HttpMethod.POST, first + "/check-in", front, Map.of("slotId", slots.getFirst()), HttpStatus.UNPROCESSABLE_ENTITY);
        for (UUID slot : slots) {
            jdbc.update("update time_slots set start_time=date_trunc('day',now() at time zone 'Asia/Ho_Chi_Minh') "
                    + "at time zone 'Asia/Ho_Chi_Minh', end_time=now()+interval '30 minutes' where id=?", slot);
        }
        JsonNode secondRow = call(HttpMethod.GET, QUEUE + "/mine" + date, other.staffUser(), null, HttpStatus.OK).get(0);
        String second = QUEUE + "/" + id + "/" + secondRow.path("itemId").asText();
        assertThat(call(HttpMethod.GET, QUEUE + "/mine" + date, s.staffUser(), null, HttpStatus.OK)).hasSize(1);
        call(HttpMethod.POST, first + "/start", s.staffUser(), null, HttpStatus.CONFLICT);
        call(HttpMethod.POST, first + "/check-in", front, Map.of("slotId", slots.getLast()), HttpStatus.CONFLICT);
        call(HttpMethod.POST, first + "/check-in", front, Map.of("slotId", slots.getFirst()), HttpStatus.OK);
        call(HttpMethod.POST, first + "/check-in", front, Map.of("slotId", slots.getFirst()), HttpStatus.OK);
        assertThat(call(HttpMethod.GET, QUEUE + "/mine" + date, s.staffUser(), null, HttpStatus.OK)
                .at("/0/checkedInAt").asText()).isNotBlank();
        call(HttpMethod.POST, first + "/start", other.staffUser(), null, HttpStatus.FORBIDDEN);
        call(HttpMethod.POST, first + "/start", s.staffUser(), null, HttpStatus.OK);
        call(HttpMethod.POST, first + "/complete", s.staffUser(), null, HttpStatus.OK);
        assertThat(call(HttpMethod.GET, "/api/v1/bookings/" + id, s.customer(), null, HttpStatus.OK)
                .path("status").asText()).isEqualTo("IN_PROGRESS");
        call(HttpMethod.POST, second + "/check-in", front, Map.of("slotId", slots.getLast()), HttpStatus.OK);
        call(HttpMethod.POST, second + "/start", other.staffUser(), null, HttpStatus.OK);
        call(HttpMethod.POST, second + "/complete", other.staffUser(), null, HttpStatus.OK);
        call(HttpMethod.POST, second + "/complete", other.staffUser(), null, HttpStatus.OK);
        assertThat(call(HttpMethod.GET, "/api/v1/bookings/" + id, s.customer(), null, HttpStatus.OK)
                .path("status").asText()).isEqualTo("COMPLETED");
        assertThat(jdbc.queryForObject("select count(*) from booking_status_history where booking_id=? "
                + "and to_status='COMPLETED'", Long.class, UUID.fromString(id))).isOne();
    }

    @Test
    void receptionCanMarkConfirmedPastAppointmentNoShowWithoutChangingPayment() {
        Scenario s = newScenario("VETERINARIAN");
        TestUser front = newUser("STAFF");
        UUID slot = s.slotIds().getFirst();
        JsonNode created = call(HttpMethod.POST, "/api/v1/bookings", s.customer(),
                bookingBody(s.petId(), s.serviceId(), slot), HttpStatus.CREATED);
        String id = created.path("id").asText();
        call(HttpMethod.POST, "/api/v1/bookings/" + id + "/confirm", s.staffUser(), null, HttpStatus.OK);
        jdbc.update("update time_slots set start_time=now()-interval '1 minute',end_time=now()+interval '29 minutes' where id=?", slot);

        call(HttpMethod.POST, QUEUE + "/" + id + "/no-show", s.customer(), null, HttpStatus.FORBIDDEN);
        JsonNode marked = call(HttpMethod.POST, QUEUE + "/" + id + "/no-show", front, null, HttpStatus.OK);

        assertThat(marked.path("status").asText()).isEqualTo("NO_SHOW");
        assertThat(marked.path("paymentStatus").asText()).isEqualTo("UNPAID");
        assertThat(call(HttpMethod.GET, "/api/v1/bookings/" + id, s.customer(), null, HttpStatus.OK)
                .path("status").asText()).isEqualTo("NO_SHOW");
        assertThat(call(HttpMethod.GET, QUEUE + "?date=" + LocalDate.now(ZONE), front, null, HttpStatus.OK))
                .noneMatch(row -> row.path("bookingId").asText().equals(id));
    }

    @Test
    void walkInReservesARealSlotAndRollsBackIfItIsNotToday() {
        Scenario s = newScenario("VETERINARIAN");
        TestUser front = newUser("STAFF");
        String path = QUEUE + "/walk-in/" + s.customer().id();
        UUID slot = s.slotIds().getFirst();
        Map<String, Object> body = bookingBody(s.petId(), s.serviceId(), slot);
        assertThat(call(HttpMethod.POST, QUEUE + "/client-pets", front, Map.of("contact", s.customer().email()),
                HttpStatus.OK).at("/0/id").asText()).isEqualTo(s.petId().toString());
        call(HttpMethod.POST, path, front, body, HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(availableSlotIds(s)).contains(slot);
        jdbc.update("update time_slots set start_time=now()+interval '1 second',end_time=now()+interval '30 minutes 1 second' where id=?", slot);
        var booking = call(HttpMethod.POST, path, front, body, HttpStatus.OK);
        assertThat(booking.path("customerId").asText()).isEqualTo(s.customer().id().toString());
        assertThat(booking.path("status").asText()).isEqualTo("CONFIRMED");
        assertThat(call(HttpMethod.GET, QUEUE + "/mine?date=" + LocalDate.now(ZONE), s.staffUser(), null,
                HttpStatus.OK).at("/0/bookingId").asText()).isEqualTo(booking.path("id").asText());
    }
}
