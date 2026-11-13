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
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;

class InvoiceTest extends IntegrationTestBase {

    private ResponseEntity<String> issue(String token, UUID bookingId) {
        return send(HttpMethod.POST, "/api/v1/invoices", token, Map.of("bookingId", bookingId.toString()));
    }

    @Test
    void invoiceIsIssuedForCompletedBookingWithServerComputedAmount() {
        Scenario s = newScenario("STAFF");
        UUID bookingId = completedBooking(s);

        ResponseEntity<String> response = issue(s.admin().token(), bookingId);

        assertThat(response.getStatusCode()).as(response.getBody()).isEqualTo(HttpStatus.CREATED);
        JsonNode data = json(response).path("data");
        assertThat(data.path("status").asText()).isEqualTo("ISSUED");
        assertThat(data.path("invoiceNumber").asText()).startsWith("INV-");
        assertThat(data.path("totalAmount").decimalValue()).isEqualByComparingTo("150000");
        assertThat(data.path("items")).hasSize(1);
        assertThat(data.path("items").get(0).path("description").asText()).isEqualTo("Kham tong quat");
    }

    @Test
    void secondInvoiceForSameBookingIsRejected() {
        Scenario s = newScenario("STAFF");
        UUID bookingId = completedBooking(s);
        issue(s.admin().token(), bookingId);

        ResponseEntity<String> second = issue(s.admin().token(), bookingId);

        assertThat(second.getStatusCode()).as(second.getBody()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(second.getBody()).contains("INVOICE_ALREADY_EXISTS");
    }

    @Test
    void invoiceCannotBeIssuedForUnfinishedBooking() {
        Scenario s = newScenario("STAFF");
        UUID bookingId = idOf(send(HttpMethod.POST, "/api/v1/bookings", s.customer().token(),
                bookingBody(s.petId(), s.serviceId(), s.slotIds().get(0))));

        ResponseEntity<String> response = issue(s.admin().token(), bookingId);

        assertThat(response.getStatusCode()).as(response.getBody()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
    }

    @Test
    void customerCannotIssueInvoice() {
        Scenario s = newScenario("STAFF");
        UUID bookingId = completedBooking(s);

        assertThat(issue(s.customer().token(), bookingId).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void customerReadsOwnInvoiceButStrangerDoesNot() {
        Scenario s = newScenario("STAFF");
        TestUser stranger = newUser("CUSTOMER");
        UUID bookingId = completedBooking(s);
        issue(s.admin().token(), bookingId);

        ResponseEntity<String> own = send(HttpMethod.GET, "/api/v1/invoices/by-booking/" + bookingId,
                s.customer().token(), null);
        ResponseEntity<String> other = send(HttpMethod.GET, "/api/v1/invoices/by-booking/" + bookingId,
                stranger.token(), null);

        assertThat(own.getStatusCode()).as(own.getBody()).isEqualTo(HttpStatus.OK);
        assertThat(other.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void issuingWritesInvoiceIssuedEventToOutbox() {
        Scenario s = newScenario("STAFF");
        UUID bookingId = completedBooking(s);
        UUID invoiceId = idOf(issue(s.admin().token(), bookingId));

        Integer count = jdbc.queryForObject(
                "select count(*) from outbox_events where aggregate_id = ? and event_type = 'invoice.issued'",
                Integer.class, invoiceId);
        assertThat(count).isEqualTo(1);

        eventually("invoice.issued is published", () -> {
            Integer published = jdbc.queryForObject(
                    "select count(*) from outbox_events where aggregate_id = ? and published_at is not null",
                    Integer.class, invoiceId);
            return published != null && published >= 1;
        });
    }

    @Test
    void concurrentIssuingCreatesExactlyOneInvoice() throws Exception {
        Scenario s = newScenario("STAFF");
        UUID bookingId = completedBooking(s);

        int attempts = 5;
        ExecutorService pool = Executors.newFixedThreadPool(attempts);
        CountDownLatch ready = new CountDownLatch(attempts);
        CountDownLatch go = new CountDownLatch(1);
        List<Future<Integer>> futures = new ArrayList<>();
        for (int i = 0; i < attempts; i++) {
            futures.add(pool.submit(() -> {
                ready.countDown();
                go.await();
                return issue(s.admin().token(), bookingId).getStatusCode().value();
            }));
        }
        ready.await();
        go.countDown();

        List<Integer> statuses = new ArrayList<>();
        for (Future<Integer> future : futures) {
            statuses.add(future.get());
        }
        pool.shutdown();

        assertThat(statuses.stream().filter(code -> code == 201).count()).as("ket qua: " + statuses).isEqualTo(1);
        assertThat(statuses.stream().filter(code -> code == 409).count()).as("ket qua: " + statuses).isEqualTo(attempts - 1);
    }
}