package com.petcare.platform.integration;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class RescheduleConfirmationTest extends IntegrationTestBase {
    @Test
    void customerRescheduleRequiresReceptionistConfirmationAgain() {
        Scenario scenario = newScenario("VETERINARIAN");
        var created = send(HttpMethod.POST, "/api/v1/bookings", scenario.customer().token(),
                bookingBody(scenario.petId(), scenario.serviceId(), scenario.slotIds().getFirst()));
        var bookingId = idOf(created);
        var itemId = json(created).at("/data/items/0/id").asText();
        jdbc.update("update bookings set status='CONFIRMED' where id=?", bookingId);
        jdbc.update("update booking_items set status='CONFIRMED' where booking_id=?", bookingId);

        var moved = send(HttpMethod.POST, "/api/v1/bookings/" + bookingId + "/items/" + itemId + "/reschedule",
                scenario.customer().token(), Map.of("expectedSlotId", scenario.slotIds().getFirst(),
                        "timeSlotId", scenario.slotIds().get(1)));

        assertThat(moved.getStatusCode()).as(moved.getBody()).isEqualTo(HttpStatus.OK);
        assertThat(json(moved).at("/data/status").asText()).isEqualTo("PENDING");
        assertThat(json(moved).at("/data/items/0/status").asText()).isEqualTo("PENDING");
        assertThat(jdbc.queryForObject("select count(*) from booking_status_history "
                + "where booking_id=? and from_status='CONFIRMED' and to_status='PENDING'", Integer.class, bookingId))
                .isEqualTo(1);
    }
}
