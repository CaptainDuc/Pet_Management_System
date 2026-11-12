package com.petcare.platform.integration;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;

class BookingTest extends IntegrationTestBase {

    private ResponseEntity<String> book(String token, UUID petId, UUID serviceId, UUID slotId) {
        return send(HttpMethod.POST, "/api/v1/bookings", token, bookingBody(petId, serviceId, slotId));
    }

    private int countEvents(UUID bookingId, String type) {
        Integer count = jdbc.queryForObject(
                "select count(*) from outbox_events where aggregate_id = ? and event_type = ?",
                Integer.class, bookingId, type);
        return count == null ? 0 : count;
    }

    @Test
    void customerCanBookAndSlotIsHeld() {
        Scenario s = newScenario("STAFF");

        ResponseEntity<String> response = book(s.customer().token(), s.petId(), s.serviceId(), s.slotIds().get(0));

        assertThat(response.getStatusCode()).as(response.getBody()).isEqualTo(HttpStatus.CREATED);
        JsonNode data = json(response).path("data");
        assertThat(data.path("status").asText()).isEqualTo("PENDING");
        assertThat(data.path("totalAmount").decimalValue()).isEqualByComparingTo("150000");

        assertThat(availableSlotIds(s)).hasSize(3).doesNotContain(s.slotIds().get(0));
    }

    @Test
    void secondBookingOnSameSlotIsRejected() {
        Scenario s = newScenario("STAFF");
        UUID slot = s.slotIds().get(0);
        TestUser other = newUser("CUSTOMER");
        UUID otherPet = createPet(other.token());

        ResponseEntity<String> first = book(s.customer().token(), s.petId(), s.serviceId(), slot);
        ResponseEntity<String> second = book(other.token(), otherPet, s.serviceId(), slot);

        assertThat(first.getStatusCode()).as(first.getBody()).isEqualTo(HttpStatus.CREATED);
        assertThat(second.getStatusCode()).as(second.getBody()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(second.getBody()).contains("SLOT_ALREADY_BOOKED");
    }

    @Test
    void concurrentBookingsOnSameSlotAllowExactlyOne() throws Exception {
        Scenario s = newScenario("STAFF");
        UUID slot = s.slotIds().get(0);

        int competitors = 8;
        List<String> tokens = new ArrayList<>();
        List<UUID> pets = new ArrayList<>();
        for (int i = 0; i < competitors; i++) {
            TestUser user = newUser("CUSTOMER");
            tokens.add(user.token());
            pets.add(createPet(user.token()));
        }

        ExecutorService pool = Executors.newFixedThreadPool(competitors);
        CountDownLatch ready = new CountDownLatch(competitors);
        CountDownLatch go = new CountDownLatch(1);
        List<Future<Integer>> futures = new ArrayList<>();
        for (int i = 0; i < competitors; i++) {
            final int index = i;
            Callable<Integer> task = () -> {
                ready.countDown();
                go.await();
                return book(tokens.get(index), pets.get(index), s.serviceId(), slot).getStatusCode().value();
            };
            futures.add(pool.submit(task));
        }
        ready.await();
        go.countDown();

        List<Integer> statuses = new ArrayList<>();
        for (Future<Integer> future : futures) {
            statuses.add(future.get());
        }
        pool.shutdown();

        assertThat(statuses.stream().filter(code -> code == 201).count())
                .as("trang thai tra ve: " + statuses).isEqualTo(1);
        assertThat(statuses.stream().filter(code -> code == 409).count())
                .as("trang thai tra ve: " + statuses).isEqualTo(competitors - 1);
    }

    @Test
    void cancelReleasesTheSlot() {
        Scenario s = newScenario("STAFF");
        UUID slot = s.slotIds().get(0);
        UUID bookingId = idOf(book(s.customer().token(), s.petId(), s.serviceId(), slot));
        assertThat(availableSlotIds(s)).doesNotContain(slot);

        ResponseEntity<String> cancel = send(HttpMethod.POST, "/api/v1/bookings/" + bookingId + "/cancel",
                s.customer().token(), Map.of("reason", "Ban dot xuat"));

        assertThat(cancel.getStatusCode()).as(cancel.getBody()).isEqualTo(HttpStatus.OK);
        assertThat(json(cancel).path("data").path("status").asText()).isEqualTo("CANCELLED");
        assertThat(availableSlotIds(s)).contains(slot);
    }

    @Test
    void cancelWithoutReasonIsRejected() {
        Scenario s = newScenario("STAFF");
        UUID bookingId = idOf(book(s.customer().token(), s.petId(), s.serviceId(), s.slotIds().get(0)));

        ResponseEntity<String> cancel = send(HttpMethod.POST, "/api/v1/bookings/" + bookingId + "/cancel",
                s.customer().token(), Map.of("reason", ""));

        assertThat(cancel.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void customerCannotConfirmTheirOwnBooking() {
        Scenario s = newScenario("STAFF");
        UUID bookingId = idOf(book(s.customer().token(), s.petId(), s.serviceId(), s.slotIds().get(0)));

        ResponseEntity<String> confirm = send(HttpMethod.POST, "/api/v1/bookings/" + bookingId + "/confirm",
                s.customer().token(), null);

        assertThat(confirm.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void invalidTransitionIsRejected() {
        Scenario s = newScenario("STAFF");
        UUID bookingId = idOf(book(s.customer().token(), s.petId(), s.serviceId(), s.slotIds().get(0)));

        ResponseEntity<String> confirm = send(HttpMethod.POST, "/api/v1/bookings/" + bookingId + "/confirm",
                s.admin().token(), null);
        assertThat(confirm.getStatusCode()).as(confirm.getBody()).isEqualTo(HttpStatus.OK);

        // CONFIRMED không được nhảy thẳng sang COMPLETED
        ResponseEntity<String> complete = send(HttpMethod.POST, "/api/v1/bookings/" + bookingId + "/complete",
                s.admin().token(), null);
        assertThat(complete.getStatusCode()).as(complete.getBody()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(complete.getBody()).contains("BOOKING_INVALID_TRANSITION");
    }

    @Test
    void otherCustomerCannotSeeOrCancelBooking() {
        Scenario s = newScenario("STAFF");
        TestUser stranger = newUser("CUSTOMER");
        UUID bookingId = idOf(book(s.customer().token(), s.petId(), s.serviceId(), s.slotIds().get(0)));

        ResponseEntity<String> read = send(HttpMethod.GET, "/api/v1/bookings/" + bookingId, stranger.token(), null);
        ResponseEntity<String> cancel = send(HttpMethod.POST, "/api/v1/bookings/" + bookingId + "/cancel",
                stranger.token(), Map.of("reason", "Khong phai cua toi"));

        assertThat(read.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(cancel.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void bookingEventIsWrittenToOutboxAndPublished() {
        Scenario s = newScenario("STAFF");
        UUID bookingId = idOf(book(s.customer().token(), s.petId(), s.serviceId(), s.slotIds().get(0)));

        assertThat(countEvents(bookingId, "booking.created")).isEqualTo(1);

        eventually("outbox event booking.created is published", () -> {
            Integer published = jdbc.queryForObject(
                    "select count(*) from outbox_events where aggregate_id = ? and published_at is not null",
                    Integer.class, bookingId);
            return published != null && published >= 1;
        });
    }

    @Test
    void failedBookingLeavesNoEventBehind() {
        Scenario s = newScenario("STAFF");
        UUID slot = s.slotIds().get(0);
        TestUser other = newUser("CUSTOMER");
        UUID otherPet = createPet(other.token());
        idOf(book(s.customer().token(), s.petId(), s.serviceId(), slot));

        Integer before = jdbc.queryForObject(
                "select count(*) from outbox_events where event_type = 'booking.created'", Integer.class);
        ResponseEntity<String> rejected = book(other.token(), otherPet, s.serviceId(), slot);
        Integer after = jdbc.queryForObject(
                "select count(*) from outbox_events where event_type = 'booking.created'", Integer.class);

        assertThat(rejected.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(after).as("dat lich that bai khong duoc de lai su kien").isEqualTo(before);
    }
}