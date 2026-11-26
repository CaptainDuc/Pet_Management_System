package com.petcare.platform.integration;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledOnOs;
import org.junit.jupiter.api.condition.OS;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.nio.file.Path;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

class BookingTest extends IntegrationTestBase {

    @LocalServerPort
    private int localPort;

    @Test
    @EnabledOnOs(OS.WINDOWS)
    void demoSetupCanRepeatWithoutReplacingExistingSchedule() throws Exception {
        Scenario s = newScenario("STAFF");
        Path script = Path.of("..", "..", "scripts", "setup-booking-demo.ps1").toAbsolutePath().normalize();
        for (int attempt = 0; attempt < 2; attempt++) {
            Process process = new ProcessBuilder("powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass",
                    "-File", script.toString(), "-BaseUrl", "http://localhost:" + localPort + "/api/v1",
                    "-AccessToken", s.admin().token(), "-StaffId", s.staffId().toString(), "-Date", s.date().toString())
                    .redirectErrorStream(true).start();
            boolean done = process.waitFor(45, TimeUnit.SECONDS);
            if (!done) process.destroyForcibly();
            assertThat(done).as("demo setup completes within 45 seconds").isTrue();
            String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            assertThat(process.exitValue()).as(output).isZero();
            assertThat(output).contains("OK:", "So gio trong: 4");
        }
        assertThat(availableSlotIds(s)).containsExactlyInAnyOrderElementsOf(s.slotIds());
        assertThat(jdbc.queryForObject("select count(*) from services where name = ?", Integer.class,
                "[DEMO] Kham thu cung - 30 phut")).isEqualTo(1);
    }

    @Test
    @EnabledOnOs(OS.WINDOWS)
    void demoBootstrapCreatesSeparateAccountWithoutChangingExistingUser() throws Exception {
        TestUser existing = newUser("CUSTOMER");
        Path script = Path.of("..", "..", "scripts", "setup-booking-demo.ps1").toAbsolutePath().normalize();
        ProcessBuilder builder = new ProcessBuilder("powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass",
                "-File", script.toString(), "-BaseUrl", "http://localhost:" + localPort + "/api/v1", "-Bootstrap",
                "-Email", "booking-demo-" + UUID.randomUUID() + "@petcare.invalid",
                "-DatabaseContainer", POSTGRES.getContainerId(), "-DatabaseUser", POSTGRES.getUsername(),
                "-DatabaseName", POSTGRES.getDatabaseName());
        builder.environment().put("PETCARE_DEMO_PASSWORD", PASSWORD);
        var emailCode = new java.util.concurrent.atomic.AtomicReference<String>();
        CountDownLatch codeSent = new CountDownLatch(1);
        org.mockito.Mockito.doAnswer(invocation -> {
            emailCode.set(invocation.getArgument(2)); codeSent.countDown(); return null;
        }).when(emailSender).send(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.eq("REGISTER"),
                org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyInt());
        Process process = builder.redirectErrorStream(true).start();
        assertThat(codeSent.await(20, TimeUnit.SECONDS)).as("bootstrap requests verification email").isTrue();
        process.getOutputStream().write((emailCode.get() + System.lineSeparator()).getBytes(StandardCharsets.UTF_8));
        process.getOutputStream().flush();
        boolean done = process.waitFor(45, TimeUnit.SECONDS);
        if (!done) process.destroyForcibly();
        assertThat(done).as("bootstrap completes within 45 seconds").isTrue();
        String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        assertThat(process.exitValue()).as(output).isZero();
        assertThat(output).contains("OK:", "Tai khoan quan tri DEMO:");
        assertThat(jdbc.queryForObject("select count(*) from user_roles ur join roles r on r.id=ur.role_id "
                + "where ur.user_id=? and r.name='ADMIN'", Integer.class, existing.id())).isZero();
        assertThat(send(HttpMethod.POST, "/api/v1/auth/login", null,
                Map.of("email", existing.email(), "password", PASSWORD)).getStatusCode()).isEqualTo(HttpStatus.OK);
    }

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
    void longerServiceRequiresEnoughConsecutiveSlots() {
        Scenario s = newScenario("STAFF");
        jdbc.update("update services set duration_minutes = 60 where id = ?", s.serviceId());
        assertThat(availableSlotIds(s)).hasSize(3);
        ResponseEntity<String> response = book(s.customer().token(), s.petId(), s.serviceId(), s.slotIds().get(3));
        assertThat(response.getStatusCode().is4xxClientError()).as(response.getBody()).isTrue();
        assertThat(response.getBody()).contains("Not enough consecutive slots");
    }

    @Test
    void guestBookingSuggestionRequiresLoginAndKeepsApiEnvelope() {
        ResponseEntity<String> response = send(HttpMethod.POST, "/api/v1/ai/tips", null,
                Map.of("question", "Tôi muốn đặt lịch khám"));
        assertThat(response.getStatusCode()).as(response.getBody()).isEqualTo(HttpStatus.OK);
        JsonNode payload = json(response);
        assertThat(payload.path("success").asBoolean()).isTrue();
        assertThat(payload.path("data").path("needsLogin").asBoolean()).isTrue();
        assertThat(payload.path("data").has("bookingForm")).isFalse();
    }

    @Test
    void aiSuggestsOwnedPetWithoutCreatingBooking() {
        Scenario s = newScenario("STAFF");
        Integer before = jdbc.queryForObject("select count(*) from bookings", Integer.class);
        ResponseEntity<String> response = send(HttpMethod.POST, "/api/v1/ai/tips", s.customer().token(),
                Map.of("question", "Tôi muốn đặt lịch khám"));
        assertThat(response.getStatusCode()).as(response.getBody()).isEqualTo(HttpStatus.OK);
        JsonNode form = json(response).path("data").path("bookingForm");
        assertThat(form.path("petId").asText()).isEqualTo(s.petId().toString());
        assertThat(form.path("requiresConfirmation").asBoolean()).isTrue();
        assertThat(jdbc.queryForObject("select count(*) from bookings", Integer.class)).isEqualTo(before);
    }

    @Test
    void promotionAndPaymentKeepServerTotalAndConsumeOnlyOnce() {
        Scenario s = newScenario("STAFF");
        String code = "MERGE-" + UUID.randomUUID();
        Map<String, Object> coupon = Map.of("code", code, "name", "Merge payment check",
                "discountType", "FIXED_AMOUNT", "discountValue", 20000, "maxUses", 1);
        assertThat(send(HttpMethod.POST, "/api/v1/promotions", s.customer().token(), coupon)
                .getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        UUID promotionId = idOf(send(HttpMethod.POST, "/api/v1/promotions", s.admin().token(), coupon));
        Map<String, Object> body = new HashMap<>(bookingBody(s.petId(), s.serviceId(), s.slotIds().get(0)));
        body.put("promotionCode", code);
        body.put("totalAmount", 1);
        ResponseEntity<String> booking = send(HttpMethod.POST, "/api/v1/bookings", s.customer().token(), body);
        UUID bookingId = idOf(booking);
        assertThat(json(booking).path("data").path("totalAmount").decimalValue()).isEqualByComparingTo("130000");
        for (int attempt = 0; attempt < 2; attempt++) {
            ResponseEntity<String> paid = send(HttpMethod.POST, "/api/v1/bookings/" + bookingId + "/mark-paid",
                    s.admin().token(), null);
            assertThat(paid.getStatusCode()).as(paid.getBody()).isEqualTo(HttpStatus.OK);
            assertThat(json(paid).path("data").path("paymentStatus").asText()).isEqualTo("PAID");
        }
        assertThat(jdbc.queryForObject("select used_count from promotions where id = ?", Integer.class, promotionId))
                .isEqualTo(1);
        ResponseEntity<String> cancelled = send(HttpMethod.POST, "/api/v1/bookings/" + bookingId + "/cancel",
                s.customer().token(), Map.of("reason", "Already paid check"));
        assertThat(cancelled.getStatusCode()).as(cancelled.getBody()).isEqualTo(HttpStatus.OK);
        assertThat(json(cancelled).path("data").path("status").asText()).isEqualTo("CANCELLED");
        assertThat(json(cancelled).path("data").path("paymentStatus").asText()).isEqualTo("PAID");
        assertThat(json(cancelled).path("data").path("paidAt").isNull()).isFalse();
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
