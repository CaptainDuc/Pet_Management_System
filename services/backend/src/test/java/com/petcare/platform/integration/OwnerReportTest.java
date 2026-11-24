package com.petcare.platform.integration;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class OwnerReportTest extends IntegrationTestBase {
    private static final String PATH = "/api/v1/analytics/dashboard";

    private JsonNode report(TestUser user) {
        var response = send(HttpMethod.GET, PATH, user.token(), null);
        assertThat(response.getStatusCode()).as(response.getBody()).isEqualTo(HttpStatus.OK);
        return json(response).path("data");
    }

    @Test
    void monthlyReportUsesDistinctEventDatesAndThePaidBookingTotal() {
        Scenario s = newScenario("STAFF");
        TestUser owner = newUser("OWNER");
        assertThat(send(HttpMethod.GET, PATH, s.customer().token(), null).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(send(HttpMethod.GET, PATH, s.staffUser().token(), null).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        var zone = ZoneId.of("Asia/Ho_Chi_Minh");
        var month = YearMonth.now(zone);
        Timestamp start = Timestamp.from(month.atDay(1).atStartOfDay(zone).toInstant());
        Timestamp end = Timestamp.from(month.plusMonths(1).atDay(1).atStartOfDay(zone).toInstant());
        JsonNode before = report(owner);
        UUID id = idOf(send(HttpMethod.POST, "/api/v1/bookings", s.customer().token(),
                bookingBody(s.petId(), s.serviceId(), s.slotIds().getFirst())));
        jdbc.update("update bookings set created_at=?, total_amount=130000, discount_amount=20000 where id=?", start, id);
        JsonNode unpaid = report(owner);
        assertThat(unpaid.path("totalBookings").asLong()).isEqualTo(before.path("totalBookings").asLong() + 1);
        assertThat(unpaid.path("totalRevenue")).isEqualTo(before.path("totalRevenue"));

        assertThat(send(HttpMethod.POST, "/api/v1/bookings/" + id + "/mark-paid", s.staffUser().token(), null)
                .getStatusCode()).isEqualTo(HttpStatus.OK);
        jdbc.update("update bookings set created_at=?, paid_at=? where id=?", new Timestamp(start.getTime() - 1), start, id);
        jdbc.update("insert into booking_status_history(booking_id,from_status,to_status,changed_by,changed_at) "
                + "values (?,'IN_PROGRESS','COMPLETED',?,?)", id, s.staffUser().id(), start);
        jdbc.update("insert into reviews(booking_id,customer_id,rating,is_published,created_at) "
                + "values (?,?,5,true,?),(?,?,1,false,?)", id, s.customer().id(), start, id, s.customer().id(), start);
        JsonNode paid = report(owner);
        assertThat(paid.path("month").asText()).isEqualTo(month.toString());
        assertThat(paid.path("totalRevenue").decimalValue()).isEqualByComparingTo(
                before.path("totalRevenue").decimalValue().add(new BigDecimal("130000")));
        assertThat(paid.path("paidBookings").asLong()).isEqualTo(before.path("paidBookings").asLong() + 1);
        assertThat(paid.path("totalBookings")).isEqualTo(before.path("totalBookings"));
        assertThat(paid.path("completedBookings").asLong()).isEqualTo(before.path("completedBookings").asLong() + 1);
        assertThat(paid.at("/ratings/count").asLong()).isEqualTo(before.at("/ratings/count").asLong() + 1);
        assertThat(paid.path("services")).isEqualTo(before.path("services"));
        assertThat(unpaid.path("services").findValuesAsText("serviceId")).contains(s.serviceId().toString());
        assertThat(paid.path("branches").findValuesAsText("name")).contains("Chưa ghi nhận chi nhánh");

        jdbc.update("update bookings set payment_status='REFUNDED' where id=?", id);
        assertThat(report(owner).path("totalRevenue")).isEqualTo(before.path("totalRevenue"));
        jdbc.update("update bookings set payment_status='PAID', paid_at=? where id=?", end, id);
        assertThat(report(s.admin()).path("totalRevenue")).isEqualTo(before.path("totalRevenue"));
    }
}
