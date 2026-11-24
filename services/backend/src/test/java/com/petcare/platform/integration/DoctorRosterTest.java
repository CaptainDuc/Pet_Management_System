package com.petcare.platform.integration;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;

import static org.assertj.core.api.Assertions.assertThat;

class DoctorRosterTest extends IntegrationTestBase {
    private JsonNode doctor(TestUser owner, UUID id) {
        var result = send(HttpMethod.GET, "/api/v1/staff/doctors", owner.token(), null);
        assertThat(result.getStatusCode()).as(result.getBody()).isEqualTo(HttpStatus.OK);
        for (var row : json(result).path("data")) if (row.path("userId").asText().equals(id.toString())) return row;
        throw new AssertionError("Doctor missing from roster");
    }

    @Test
    void newDoctorReceivesAllActiveServicesFromTheirRole() throws Exception {
        Scenario s = newScenario("VETERINARIAN");
        TestUser owner = newUser("OWNER"), vet = newUser("VETERINARIAN");
        jdbc.update("update users set role='CUSTOMER' where id=?", vet.id());
        assertThat(doctor(owner, vet.id()).path("staffId").asText("")).isEmpty();
        assertThat(send(HttpMethod.GET, "/api/v1/staff/doctors", s.customer().token(), null)
                .getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        var firstResponse = new CountDownLatch(1);
        try (var pool = Executors.newFixedThreadPool(2)) {
            var create = (java.util.concurrent.Callable<Integer>) () -> {
                firstResponse.await();
                return send(HttpMethod.POST, "/api/v1/staff", owner.token(), Map.of(
                        "userId", vet.id(), "position", "Bác sĩ thú y")).getStatusCode().value();
            };
            var first = pool.submit(create);
            var second = pool.submit(create);
            firstResponse.countDown();
            assertThat(List.of(first.get(), second.get())).containsExactlyInAnyOrder(201, 422);
        }
        String staff = doctor(owner, vet.id()).path("staffId").asText();
        idOf(send(HttpMethod.POST, "/api/v1/schedules", owner.token(), Map.of(
                "staffId", staff, "workDate", s.date(), "startTime", "08:00",
                "endTime", "09:00", "slotDurationMinutes", 30)));
        String slots = "/api/v1/schedules/slots/available?date=" + s.date() + "&staffId=" + staff
                + "&serviceId=" + s.serviceId();
        var available = json(send(HttpMethod.GET, slots, s.customer().token(), null)).at("/data/staff");
        assertThat(available).hasSize(1);
        assertThat(doctor(owner, vet.id()).path("serviceCount").asInt()).isEqualTo(
                jdbc.queryForObject("select count(*) from services where is_active", Integer.class));
        var slot = available.at("/0/slots/0/slotId").asText();
        var booking = send(HttpMethod.POST, "/api/v1/bookings", s.customer().token(),
                Map.of("petId", s.petId(), "items", List.of(Map.of("serviceId", s.serviceId(),
                        "timeSlotId", slot, "preferredStaffId", staff))));
        assertThat(booking.getStatusCode()).as(booking.getBody()).isEqualTo(HttpStatus.CREATED);
        assignReserved(idOf(booking), owner);
    }
}
