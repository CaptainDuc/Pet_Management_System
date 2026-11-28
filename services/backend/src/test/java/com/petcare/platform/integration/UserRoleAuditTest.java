package com.petcare.platform.integration;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class UserRoleAuditTest extends IntegrationTestBase {

    @Test
    void adminRoleAndStatusChangesAreSavedAndAudited() {
        TestUser admin = newUser("ADMIN");
        TestUser customer = newUser("CUSTOMER");
        UUID staffRoleId = jdbc.queryForObject("select id from roles where name='STAFF'", UUID.class);

        var assigned = send(HttpMethod.POST, "/api/v1/users/" + customer.id() + "/roles", admin.token(),
                Map.of("roleIds", new String[]{staffRoleId.toString()}));
        assertThat(assigned.getStatusCode()).as(assigned.getBody()).isEqualTo(HttpStatus.OK);
        assertThat(json(assigned).path("data").path("role").asText()).isEqualTo("STAFF");
        assertThat(jdbc.queryForObject("select count(*) from audit_logs where entity_id=? and action='USER_ROLES_CHANGED'", Integer.class, customer.id())).isEqualTo(1);

        var locked = send(HttpMethod.PATCH, "/api/v1/users/" + customer.id() + "/status", admin.token(),
                Map.of("status", "INACTIVE"));
        assertThat(locked.getStatusCode()).as(locked.getBody()).isEqualTo(HttpStatus.OK);
        assertThat(jdbc.queryForObject("select count(*) from audit_logs where entity_id=? and action='USER_STATUS_CHANGED'", Integer.class, customer.id())).isEqualTo(1);
        assertThat(jdbc.queryForObject("select new_value->>'status' from audit_logs where entity_id=? and action='USER_STATUS_CHANGED'", String.class, customer.id())).isEqualTo("INACTIVE");
    }

    @Test
    void ownerServiceAndScheduleChangesAreAuthorizedAndAudited() {
        TestUser owner = newUser("OWNER");
        TestUser customer = newUser("CUSTOMER");
        var payload = Map.of("name", "Khám tổng quát kiểm toán", "basePrice", 120000, "durationMinutes", 30);
        var forbidden = send(HttpMethod.POST, "/api/v1/services", customer.token(), payload);
        assertThat(forbidden.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        UUID serviceId = idOf(send(HttpMethod.POST, "/api/v1/services", owner.token(), payload));
        var updated = send(HttpMethod.PUT, "/api/v1/services/" + serviceId, owner.token(),
                Map.of("name", "Khám tổng quát kiểm toán", "basePrice", 130000, "durationMinutes", 30));
        assertThat(updated.getStatusCode()).as(updated.getBody()).isEqualTo(HttpStatus.OK);
        assertThat(jdbc.queryForObject("select count(*) from audit_logs where entity_id=? and action in ('SERVICE_CREATED','SERVICE_UPDATED')", Integer.class, serviceId)).isEqualTo(2);
        assertThat(jdbc.queryForObject("select (new_value->>'basePrice')::numeric from audit_logs where entity_id=? and action='SERVICE_UPDATED'", java.math.BigDecimal.class, serviceId)).isEqualByComparingTo("130000");

        Scenario scenario = newScenario("VETERINARIAN");
        UUID shiftId = jdbc.queryForObject("select id from schedules where staff_id=? and work_date=?", UUID.class,
                scenario.staffId(), scenario.date());
        var toggled = send(HttpMethod.PATCH, "/api/v1/schedules/" + shiftId + "/availability", owner.token(),
                Map.of("available", false));
        assertThat(toggled.getStatusCode()).as(toggled.getBody()).isEqualTo(HttpStatus.OK);
        assertThat(jdbc.queryForObject("select count(*) from audit_logs where entity_id=? and action='SCHEDULE_AVAILABILITY_CHANGED'", Integer.class, shiftId)).isEqualTo(1);
    }
}
