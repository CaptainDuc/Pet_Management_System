package com.petcare.platform.analytics.service;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AnalyticsService {
    private static final ZoneId CLINIC_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private final JdbcClient jdbc;

    public record BranchRevenue(UUID branchId, String name, BigDecimal revenue, long paidBookings) {}
    public record ServiceCount(UUID serviceId, String name, long quantity) {}
    public record Ratings(long count, BigDecimal average) {}
    public record Feedback(UUID bookingId, int rating, String comment, boolean published) {}
    public record Dashboard(String month, BigDecimal totalRevenue, long paidBookings, long totalBookings,
                            long completedBookings, long activePets, Ratings ratings,
                            List<BranchRevenue> branches, List<ServiceCount> services, List<Feedback> recentFeedback) {}

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public Dashboard getDashboardStats() {
        YearMonth month = YearMonth.now(CLINIC_ZONE);
        var period = Map.of(
                "start", Timestamp.from(month.atDay(1).atStartOfDay(CLINIC_ZONE).toInstant()),
                "end", Timestamp.from(month.plusMonths(1).atDay(1).atStartOfDay(CLINIC_ZONE).toInstant()));

        var branches = jdbc.sql("""
                select b.branch_id, coalesce(br.name, 'Chưa ghi nhận chi nhánh') as name,
                       sum(b.total_amount) as revenue, count(*) as paid_bookings
                from bookings b left join branches br on br.id = b.branch_id
                where b.payment_status = 'PAID' and b.paid_at >= :start and b.paid_at < :end
                group by b.branch_id, br.name order by revenue desc, name, b.branch_id
                """).params(period).query(BranchRevenue.class).list();
        BigDecimal revenue = branches.stream().map(BranchRevenue::revenue).reduce(BigDecimal.ZERO, BigDecimal::add);
        long paid = branches.stream().mapToLong(BranchRevenue::paidBookings).sum();
        long bookings = jdbc.sql("""
                select count(*) from bookings where created_at >= :start and created_at < :end
                """).params(period).query(Long.class).single();
        long completed = jdbc.sql("""
                select count(distinct booking_id) from booking_status_history
                where to_status = 'COMPLETED' and from_status is distinct from 'COMPLETED'
                  and changed_at >= :start and changed_at < :end
                """).params(period).query(Long.class).single();
        long activePets = jdbc.sql("select count(*) from pets where is_active").query(Long.class).single();
        var ratings = jdbc.sql("""
                select count(*) as count, round(avg(rating), 1) as average from reviews
                where is_published and created_at >= :start and created_at < :end
                """).params(period).query(Ratings.class).single();
        var services = jdbc.sql("""
                select s.id as service_id, s.name, count(*) as quantity
                from bookings b join booking_items i on i.booking_id = b.id join services s on s.id = i.service_id
                where b.created_at >= :start and b.created_at < :end
                group by s.id, s.name order by quantity desc, s.name, s.id
                """).params(period).query(ServiceCount.class).list();
        var feedback = jdbc.sql("""
                select booking_id, rating, comment, is_published as published from reviews
                where created_at >= :start and created_at < :end order by created_at desc, id limit 5
                """).params(period).query(Feedback.class).list();
        return new Dashboard(month.toString(), revenue, paid, bookings, completed, activePets, ratings, branches, services, feedback);
    }
}
