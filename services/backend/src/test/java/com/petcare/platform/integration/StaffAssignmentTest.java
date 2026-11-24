package com.petcare.platform.integration;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;

import static org.assertj.core.api.Assertions.assertThat;

class StaffAssignmentTest extends IntegrationTestBase {
    @Test
    void automaticRequestsReserveExactlyTheAvailableCapacityAtTheSameHour() throws Exception {
        Scenario a = newScenario("VETERINARIAN"), b = newScenario("VETERINARIAN");
        jdbc.update("update services set duration_minutes=60 where id=?", a.serviceId());
        var start = new CountDownLatch(1);
        Callable<Integer> book = () -> {
            start.await();
            return send(HttpMethod.POST, "/api/v1/bookings", a.customer().token(),
                    bookingBody(a.petId(), a.serviceId(), a.slotIds().getFirst())).getStatusCode().value();
        };
        try (var pool = Executors.newFixedThreadPool(3)) {
            var first = pool.submit(book);
            var second = pool.submit(book);
            var third = pool.submit(book);
            start.countDown();
            assertThat(List.of(first.get(), second.get(), third.get())).containsExactlyInAnyOrder(201, 201, 409);
        }
        assertThat(jdbc.queryForObject("select count(distinct i.time_slot_id) from booking_items i where "
                + "i.service_id=? and i.staff_id is null", Integer.class, a.serviceId())).isEqualTo(2);
        assertThat(jdbc.queryForObject("select count(*) from booking_item_slots r join booking_items i "
                + "on i.id=r.booking_item_id where i.service_id=?", Integer.class, a.serviceId())).isEqualTo(4);
    }

    @Test
    void receptionHonoursPreferenceAndTransfersPaidReservationAfterCustomerConsent() {
        Scenario a = newScenario("VETERINARIAN"), b = newScenario("VETERINARIAN");
        TestUser front = newUser("STAFF");
        var old = a.slotIds().getFirst();
        var target = b.slotIds().getFirst();
        var booking = send(HttpMethod.POST, "/api/v1/bookings", a.customer().token(), Map.of("petId", a.petId(),
                "items", List.of(Map.of("serviceId", a.serviceId(), "timeSlotId", old, "preferredStaffId", a.staffId()))));
        var id = idOf(booking);
        var item = json(booking).at("/data/items/0");
        assertThat(item.path("staffId").asText("")).isEmpty();
        assertThat(item.path("preferredStaffName").asText()).isEqualTo(a.staffUser().fullName());
        var prefix = "/api/v1/bookings/queue/" + id + "/" + item.path("id").asText();
        assertThat(json(send(HttpMethod.GET, prefix + "/candidates", front.token(), null)).path("data").findValuesAsText("staffId"))
                .containsExactlyInAnyOrder(a.staffId().toString(), b.staffId().toString());
        assertThat(send(HttpMethod.POST, "/api/v1/bookings/" + id + "/mark-paid", front.token(), null)
                .getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(json(send(HttpMethod.GET, "/api/v1/bookings/queue/pending", front.token(), null))
                .path("data").findValuesAsText("itemId")).contains(item.path("id").asText());
        assertThat(send(HttpMethod.GET, prefix + "/candidates", a.customer().token(), null)
                .getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        var request = Map.of("expectedSlotId", old, "targetSlotId", target);
        assertThat(send(HttpMethod.POST, prefix + "/assign", front.token(), request).getStatusCode())
                .isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        var accepted = Map.of("expectedSlotId", old, "targetSlotId", target, "customerAgreed", true);
        assertThat(send(HttpMethod.POST, prefix + "/assign", b.staffUser().token(), accepted).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
        jdbc.update("update schedules set is_available=false where staff_id=?", a.staffId());
        assertThat(json(send(HttpMethod.GET, prefix + "/candidates", front.token(), null)).path("data").findValuesAsText("staffId"))
                .containsExactly(b.staffId().toString());
        var assigned = send(HttpMethod.POST, prefix + "/assign", front.token(), request);
        assertThat(assigned.getStatusCode()).as(assigned.getBody()).isEqualTo(HttpStatus.OK);
        assertThat(json(assigned).at("/data/paymentStatus").asText()).isEqualTo("PAID");
        assertThat(json(assigned).at("/data/items/0/staffName").asText()).isEqualTo(b.staffUser().fullName());
        assertThat(json(assigned).at("/data/items/0/startTime")).isEqualTo(item.path("startTime"));
        assertThat(send(HttpMethod.POST, prefix + "/assign", front.token(), accepted).getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(jdbc.queryForObject("select is_booked from time_slots where id=?", Boolean.class, old)).isFalse();
        assertThat(jdbc.queryForObject("select is_booked from time_slots where id=?", Boolean.class, target)).isTrue();
        assertThat(json(send(HttpMethod.GET, "/api/v1/bookings/queue/mine?date=" + a.date(), b.staffUser().token(), null))
                .path("data").findValuesAsText("itemId")).contains(item.path("id").asText());
    }
}
