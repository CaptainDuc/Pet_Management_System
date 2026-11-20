package com.petcare.platform.integration;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

class BookingDurationTest extends IntegrationTestBase {
    @Test
    void aiMatchesApprovedComboWithoutCreatingAnAppointment() {
        Scenario s = newScenario("STAFF");
        Integer before = jdbc.queryForObject("select count(*) from bookings", Integer.class);
        ResponseEntity<String> response = send(HttpMethod.POST, "/api/v1/ai/tips", s.customer().token(),
                Map.of("question", "Đặt lịch Combo cao cấp"));
        assertThat(response.getStatusCode()).as(response.getBody()).isEqualTo(HttpStatus.OK);
        JsonNode form = json(response).path("data").path("bookingForm");
        assertThat(form.path("serviceId").asText()).isEqualTo("ca4e1000-0000-4000-8000-000000000008");
        assertThat(form.path("estimatedPrice").decimalValue()).isEqualByComparingTo("450000");
        assertThat(form.path("durationMinutes").asInt()).isEqualTo(150);
        assertThat(form.path("requiresConfirmation").asBoolean()).isTrue();
        assertThat(jdbc.queryForObject("select count(*) from bookings", Integer.class)).isEqualTo(before);
    }

    @Test
    void testScheduleSeedRepeatsWithoutReplacingExistingSlots() throws Exception {
        TestUser admin = newUser("ADMIN");
        ResponseEntity<String> registered = send(HttpMethod.POST, "/api/v1/auth/register", null, Map.of(
                "fullName", "Care schedule test", "email", "staff.test@petcare.invalid", "password", PASSWORD));
        assertThat(registered.getStatusCode()).as(registered.getBody()).isEqualTo(HttpStatus.CREATED);
        UUID userId = UUID.fromString(json(registered).path("data").path("user").path("id").asText());
        UUID staffId = idOf(send(HttpMethod.POST, "/api/v1/staff", admin.token(), Map.of("userId", userId)));
        var date = java.time.LocalDate.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).plusDays(1);
        UUID scheduleId = idOf(send(HttpMethod.POST, "/api/v1/schedules", admin.token(), Map.of(
                "staffId", staffId, "workDate", date.toString(), "startTime", "10:00:00", "endTime", "12:00:00", "slotDurationMinutes", 30)));
        List<UUID> before = jdbc.queryForList("select id from time_slots where schedule_id=? order by start_time", UUID.class, scheduleId);
        String script = Files.readString(Path.of("..", "..", "infrastructure", "postgres", "seed_care_test_schedule.sql"), StandardCharsets.UTF_8);
        jdbc.execute(script);
        jdbc.execute(script);
        assertThat(jdbc.queryForList("select id from time_slots where schedule_id=? order by start_time", UUID.class, scheduleId)).isEqualTo(before);
        assertThat(jdbc.queryForObject("select count(*) from schedules where staff_id=?", Integer.class, staffId)).isEqualTo(14);
        assertThat(jdbc.queryForObject("select count(*) from staff_skills where staff_id=?", Integer.class, staffId)).isEqualTo(8);
    }
    private ResponseEntity<String> book(Scenario s, UUID slot) {
        return send(HttpMethod.POST, "/api/v1/bookings", s.customer().token(),
                bookingBody(s.petId(), s.serviceId(), slot));
    }

    private int heldSlots(Scenario s) {
        return jdbc.queryForObject("select count(*) from time_slots t join schedules s on s.id=t.schedule_id "
                + "where s.staff_id=? and s.work_date=? and t.is_booked", Integer.class, s.staffId(), s.date());
    }

    @ParameterizedTest
    @ValueSource(ints = {30, 60, 90, 120, 150})
    void fullDurationIsReservedPricedOnceAndReleased(int minutes) {
        Scenario original = newScenario("STAFF");
        var date = original.date().plusDays(1);
        idOf(send(HttpMethod.POST, "/api/v1/schedules", original.admin().token(), Map.of(
                "staffId", original.staffId(), "workDate", date.toString(), "startTime", "08:00:00",
                "endTime", "12:00:00", "slotDurationMinutes", 30)));
        Scenario s = new Scenario(original.admin(), original.customer(), original.staffUser(), original.petId(),
                original.serviceId(), original.staffId(), date, List.of());
        List<UUID> nativeSlots = availableSlotIds(s);
        assertThat(nativeSlots).hasSize(8);
        jdbc.update("update services set duration_minutes=? where id=?", minutes, s.serviceId());
        int candidates = 9 - minutes / 30;
        assertThat(availableSlotIds(s)).hasSize(candidates);

        ResponseEntity<String> created = book(s, nativeSlots.getFirst());
        UUID id = idOf(created);
        JsonNode data = json(created).path("data");
        JsonNode item = data.path("items").get(0);
        assertThat(data.path("items")).hasSize(1);
        assertThat(data.path("totalAmount").decimalValue()).isEqualByComparingTo("150000");
        assertThat(item.path("unitPrice").decimalValue()).isEqualByComparingTo("150000");
        assertThat(Duration.between(OffsetDateTime.parse(item.path("startTime").asText()),
                OffsetDateTime.parse(item.path("endTime").asText())).toMinutes()).isEqualTo(minutes);
        assertThat(heldSlots(s)).isEqualTo(minutes / 30);
        assertThat(jdbc.queryForObject("select count(*) from booking_item_slots r join booking_items i "
                + "on i.id=r.booking_item_id where i.booking_id=?", Integer.class, id)).isEqualTo(minutes / 30);

        // A catalogue edit must not change the already booked price or time interval.
        jdbc.update("update services set duration_minutes=180, base_price=999999 where id=?", s.serviceId());
        JsonNode saved = json(send(HttpMethod.GET, "/api/v1/bookings/" + id, s.customer().token(), null)).path("data");
        assertThat(saved.path("totalAmount").decimalValue()).isEqualByComparingTo("150000");
        assertThat(saved.path("items").get(0).path("endTime").asText()).isEqualTo(item.path("endTime").asText());
        jdbc.update("update services set duration_minutes=? where id=?", minutes, s.serviceId());
        ResponseEntity<String> cancelled = send(HttpMethod.POST, "/api/v1/bookings/" + id + "/cancel",
                s.customer().token(), Map.of("reason", "Duration test complete"));
        assertThat(cancelled.getStatusCode()).as(cancelled.getBody()).isEqualTo(HttpStatus.OK);
        assertThat(heldSlots(s)).isZero();
        assertThat(availableSlotIds(s)).hasSize(candidates).contains(nativeSlots.getFirst());
    }

    @Test
    void occupiedMiddleSlotHidesEveryOverlappingWindowAndRollsBackPartialHold() {
        Scenario s = newScenario("STAFF");
        idOf(book(s, s.slotIds().get(1)));
        jdbc.update("update services set duration_minutes=60 where id=?", s.serviceId());
        assertThat(availableSlotIds(s)).containsExactly(s.slotIds().get(2));
        ResponseEntity<String> rejected = book(s, s.slotIds().getFirst());
        assertThat(rejected.getStatusCode()).as(rejected.getBody()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(heldSlots(s)).isEqualTo(1);
        JsonNode groups = json(send(HttpMethod.GET, "/api/v1/schedules/slots/available?date=" + s.date()
                + "&serviceId=" + s.serviceId() + "&includeBooked=true", s.customer().token(), null)).path("data").path("staff");
        JsonNode slots = groups.get(0).path("slots");
        assertThat(slots).hasSize(3);
        assertThat(slots.get(0).path("available").asBoolean()).isFalse();
        assertThat(slots.get(1).path("available").asBoolean()).isFalse();
        assertThat(slots.get(2).path("available").asBoolean()).isTrue();
    }

    @Test
    void missingSlotCannotBeBridged() {
        Scenario s = newScenario("STAFF");
        jdbc.update("delete from time_slots where id=?", s.slotIds().get(1));
        jdbc.update("update services set duration_minutes=60 where id=?", s.serviceId());
        assertThat(availableSlotIds(s)).containsExactly(s.slotIds().get(2));
        ResponseEntity<String> rejected = book(s, s.slotIds().getFirst());
        assertThat(rejected.getStatusCode()).as(rejected.getBody()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(heldSlots(s)).isZero();
    }

    @Test
    void overlappingItemsInOneBookingAreRejected() {
        Scenario s = newScenario("STAFF");
        jdbc.update("update services set duration_minutes=60 where id=?", s.serviceId());
        ResponseEntity<String> rejected = send(HttpMethod.POST, "/api/v1/bookings", s.customer().token(), Map.of(
                "petId", s.petId(), "items", List.of(
                        Map.of("serviceId", s.serviceId(), "timeSlotId", s.slotIds().get(0)),
                        Map.of("serviceId", s.serviceId(), "timeSlotId", s.slotIds().get(1)))));
        assertThat(rejected.getStatusCode()).as(rejected.getBody()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(rejected.getBody()).contains("overlap");
        assertThat(heldSlots(s)).isZero();
    }

    @Test
    void concurrentDifferentStartsSharingOneSlotAllowExactlyOneBooking() throws Exception {
        Scenario s = newScenario("STAFF");
        jdbc.update("update services set duration_minutes=60 where id=?", s.serviceId());
        CountDownLatch start = new CountDownLatch(1);
        try (var pool = Executors.newFixedThreadPool(2)) {
            List<Future<ResponseEntity<String>>> results = new ArrayList<>();
            for (int index = 0; index < 2; index++) {
                UUID slot = s.slotIds().get(index);
                results.add(pool.submit(() -> { start.await(); return book(s, slot); }));
            }
            start.countDown();
            List<HttpStatus> statuses = new ArrayList<>();
            for (var result : results) statuses.add(HttpStatus.valueOf(result.get().getStatusCode().value()));
            assertThat(statuses).containsExactlyInAnyOrder(HttpStatus.CREATED, HttpStatus.CONFLICT);
        }
        assertThat(heldSlots(s)).isEqualTo(2);
        assertThat(jdbc.queryForObject("select count(*) from bookings where customer_id=?", Integer.class,
                s.customer().id())).isEqualTo(1);
    }

    @Test
    void legacySingleSlotStillReadsAndCancelsWithoutJoinRows() {
        Scenario s = newScenario("STAFF");
        UUID id = idOf(book(s, s.slotIds().getFirst()));
        jdbc.update("delete from booking_item_slots where booking_item_id in (select id from booking_items where booking_id=?)", id);
        assertThat(send(HttpMethod.GET, "/api/v1/bookings/" + id, s.customer().token(), null).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(send(HttpMethod.POST, "/api/v1/bookings/" + id + "/cancel", s.customer().token(),
                Map.of("reason", "Legacy cancellation check")).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(heldSlots(s)).isZero();
    }

    @Test
    void approvedCatalogueKeepsAllEightPricesAndDurations() {
        int[] durations = {60, 60, 30, 30, 30, 90, 120, 150};
        int[] prices = {200000, 250000, 50000, 50000, 100000, 200000, 300000, 450000};
        for (int index=0; index<8; index++) {
            String id = "ca4e1000-0000-4000-8000-" + String.format("%012d", index+1);
            ResponseEntity<String> response = send(HttpMethod.GET, "/api/v1/services/" + id, null, null);
            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
            JsonNode service = json(response).path("data");
            assertThat(service.path("basePrice").decimalValue()).isEqualByComparingTo(String.valueOf(prices[index]));
            assertThat(service.path("durationMinutes").asInt()).isEqualTo(durations[index]);
            assertThat(service.path("isActive").asBoolean()).isTrue();
        }
    }
}
