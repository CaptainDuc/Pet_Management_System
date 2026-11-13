package com.petcare.platform.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.containers.RabbitMQContainer;
import org.testcontainers.utility.DockerImageName;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TimeZone;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.BooleanSupplier;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public abstract class IntegrationTestBase {

    // Hai container dùng chung cho mọi lớp test, khởi động một lần
    static final PostgreSQLContainer<?> POSTGRES;
    static final RabbitMQContainer RABBIT;

    static {
        // Tránh lỗi múi giờ "Asia/Saigon" của PostgreSQL 16 trên Windows
        TimeZone.setDefault(TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));

        POSTGRES = new PostgreSQLContainer<>(
                DockerImageName.parse("pgvector/pgvector:pg16").asCompatibleSubstituteFor("postgres"))
                .withInitScript("init-test.sql");
        RABBIT = new RabbitMQContainer("rabbitmq:3.13-alpine");
        POSTGRES.start();
        RABBIT.start();
    }

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.rabbitmq.host", RABBIT::getHost);
        registry.add("spring.rabbitmq.port", RABBIT::getAmqpPort);
        registry.add("spring.rabbitmq.username", RABBIT::getAdminUsername);
        registry.add("spring.rabbitmq.password", RABBIT::getAdminPassword);
        registry.add("spring.cache.type", () -> "none");
        registry.add("app.outbox.poll-interval-ms", () -> "500");
    }

    protected static final ObjectMapper MAPPER = new ObjectMapper();
    protected static final String PASSWORD = "Passw0rd!123";
    private static final AtomicLong COUNTER = new AtomicLong(System.nanoTime() % 90_000_000L);

    @Autowired
    protected TestRestTemplate rest;

    @Autowired
    protected JdbcTemplate jdbc;

    protected record TestUser(UUID id, String email, String fullName, String token) {}

    protected record Scenario(TestUser admin, TestUser customer, TestUser staffUser,
                              UUID petId, UUID serviceId, UUID staffId,
                              LocalDate date, List<UUID> slotIds) {}

    @BeforeEach
    void useJdkHttpClient() {
        // Client mặc định của TestRestTemplate lỗi khi gặp 401 trên POST, dùng client của JDK
        rest.getRestTemplate().setRequestFactory(new JdkClientHttpRequestFactory());
    }

    // ─── HTTP ──────────────────────────────────────────────────────────────

    protected ResponseEntity<String> send(HttpMethod method, String path, String token, Object body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (token != null) {
            headers.setBearerAuth(token);
        }
        return rest.exchange(path, method, new HttpEntity<>(body, headers), String.class);
    }

    protected JsonNode json(ResponseEntity<String> response) {
        try {
            return MAPPER.readTree(response.getBody());
        } catch (Exception e) {
            throw new IllegalStateException("Invalid JSON: " + response.getBody(), e);
        }
    }

    protected UUID idOf(ResponseEntity<String> response) {
        assertThat(response.getStatusCode().is2xxSuccessful())
                .as(String.valueOf(response.getBody())).isTrue();
        return UUID.fromString(json(response).path("data").path("id").asText());
    }

    // ─── Người dùng ────────────────────────────────────────────────────────

    protected TestUser newUser(String role) {
        long n = COUNTER.incrementAndGet();
        String email = "user" + n + "@test.petcare.vn";
        String fullName = "Test User " + n;
        String phone = "09" + String.format("%08d", n % 100_000_000L);

        ResponseEntity<String> register = send(HttpMethod.POST, "/api/v1/auth/register", null,
                Map.of("fullName", fullName, "email", email, "password", PASSWORD, "phone", phone));
        assertThat(register.getStatusCode().is2xxSuccessful())
                .as("register: " + register.getBody()).isTrue();

        if (!"CUSTOMER".equals(role)) {
            promote(email, role);
        }
        UUID id = jdbc.queryForObject("select id from users where email = ?", UUID.class, email);
        return new TestUser(id, email, fullName, login(email));
    }

    // Đổi vai trò bằng SQL (giống cách làm khi chạy thử thủ công), rồi đăng nhập lại để lấy token
    private void promote(String email, String role) {
        jdbc.update("delete from user_roles where user_id = (select id from users where email = ?)", email);
        jdbc.update("update users set role = ? where email = ?", role, email);
        jdbc.update("insert into user_roles (user_id, role_id) "
                + "select u.id, r.id from users u, roles r where u.email = ? and r.name = ?", email, role);
    }

    protected String login(String email) {
        ResponseEntity<String> response = send(HttpMethod.POST, "/api/v1/auth/login", null,
                Map.of("email", email, "password", PASSWORD));
        assertThat(response.getStatusCode()).as("login: " + response.getBody()).isEqualTo(HttpStatus.OK);
        return json(response).path("data").path("accessToken").asText();
    }

    protected UUID createPet(String token) {
        return idOf(send(HttpMethod.POST, "/api/v1/pets", token,
                Map.of("name", "Mimi", "species", "Cat", "gender", "FEMALE")));
    }

    // ─── Kịch bản đặt lịch: dịch vụ 30 phút, nhân viên, ca sáng ngày mai (4 khung) ─────

    protected Scenario newScenario(String staffRole) {
        TestUser admin = newUser("ADMIN");
        TestUser customer = newUser("CUSTOMER");
        TestUser staffUser = newUser(staffRole);

        UUID petId = createPet(customer.token());
        UUID serviceId = idOf(send(HttpMethod.POST, "/api/v1/services", admin.token(),
                Map.of("name", "Kham tong quat", "description", "Test",
                        "basePrice", 150000, "durationMinutes", 30)));
        UUID staffId = idOf(send(HttpMethod.POST, "/api/v1/staff", admin.token(),
                Map.of("userId", staffUser.id().toString())));

        ResponseEntity<String> skills = send(HttpMethod.POST, "/api/v1/staff/" + staffId + "/skills",
                admin.token(), Map.of("serviceIds", List.of(serviceId.toString()),
                        "proficiencyLevel", "EXPERT"));
        assertThat(skills.getStatusCode().is2xxSuccessful()).as(skills.getBody()).isTrue();

        LocalDate date = LocalDate.now().plusDays(1);
        ResponseEntity<String> schedule = send(HttpMethod.POST, "/api/v1/schedules", admin.token(),
                Map.of("staffId", staffId.toString(), "workDate", date.toString(),
                        "startTime", "08:00:00", "endTime", "10:00:00", "slotDurationMinutes", 30));
        assertThat(schedule.getStatusCode().is2xxSuccessful()).as(schedule.getBody()).isTrue();

        Scenario partial = new Scenario(admin, customer, staffUser, petId, serviceId, staffId, date, List.of());
        List<UUID> slotIds = availableSlotIds(partial);
        assertThat(slotIds).as("4 khung gio 30 phut tu 08:00 den 10:00").hasSize(4);
        return new Scenario(admin, customer, staffUser, petId, serviceId, staffId, date, slotIds);
    }

    protected List<UUID> availableSlotIds(Scenario s) {
        ResponseEntity<String> response = send(HttpMethod.GET,
                "/api/v1/schedules/slots/available?date=" + s.date() + "&serviceId=" + s.serviceId(),
                s.customer().token(), null);
        assertThat(response.getStatusCode()).as(response.getBody()).isEqualTo(HttpStatus.OK);
        List<UUID> ids = new ArrayList<>();
        for (JsonNode staff : json(response).path("data").path("staff")) {
            for (JsonNode slot : staff.path("slots")) {
                ids.add(UUID.fromString(slot.path("slotId").asText()));
            }
        }
        return ids;
    }

    protected Map<String, Object> bookingBody(UUID petId, UUID serviceId, UUID slotId) {
        return Map.of("petId", petId.toString(),
                "items", List.of(Map.of("serviceId", serviceId.toString(),
                        "timeSlotId", slotId.toString())));
    }

    // ─── Chờ điều kiện (dùng cho việc gửi sự kiện bất đồng bộ) ────────────────

        // Đưa một lịch hẹn qua đủ các bước đến COMPLETED, trả về mã lịch hẹn
    protected UUID completedBooking(Scenario s) {
        UUID slot = s.slotIds().get(0);
        UUID bookingId = idOf(send(HttpMethod.POST, "/api/v1/bookings", s.customer().token(),
                bookingBody(s.petId(), s.serviceId(), slot)));

        ResponseEntity<String> confirm = send(HttpMethod.POST, "/api/v1/bookings/" + bookingId + "/confirm",
                s.admin().token(), null);
        assertThat(confirm.getStatusCode()).as(confirm.getBody()).isEqualTo(HttpStatus.OK);

        // Kéo giờ khung về hiện tại để được phép bắt đầu
        jdbc.update("update time_slots set start_time = now() - interval '10 minutes', "
                + "end_time = now() + interval '20 minutes' where id = ?", slot);

        ResponseEntity<String> start = send(HttpMethod.POST, "/api/v1/bookings/" + bookingId + "/start",
                s.admin().token(), null);
        assertThat(start.getStatusCode()).as(start.getBody()).isEqualTo(HttpStatus.OK);

        ResponseEntity<String> complete = send(HttpMethod.POST, "/api/v1/bookings/" + bookingId + "/complete",
                s.admin().token(), null);
        assertThat(complete.getStatusCode()).as(complete.getBody()).isEqualTo(HttpStatus.OK);
        return bookingId;
    }
    
    protected void eventually(String description, BooleanSupplier condition) {
        long deadline = System.currentTimeMillis() + 20_000;
        while (System.currentTimeMillis() < deadline) {
            if (condition.getAsBoolean()) {
                return;
            }
            try {
                Thread.sleep(300);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
        }
        throw new AssertionError("Timed out waiting for: " + description);
    }
}