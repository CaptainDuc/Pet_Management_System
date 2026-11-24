package com.petcare.platform.booking.service;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class VisitQueue {
    static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private final JdbcClient jdbc;

    public record Visit(UUID bookingId, UUID itemId, UUID slotId, Instant startTime, String customerName,
                        String petName, String serviceName, String staffName, UUID preferredStaffId, String preferredStaffName,
                        String status, Instant checkedInAt) {}
    public record ClientPet(UUID customerId, String customerName, UUID id, String name, String species) {}

    public List<Visit> list(LocalDate date, UUID assignedUser, boolean pending) {
        String sql = """
                select b.id as booking_id, i.id as item_id, t.id as slot_id, t.start_time,
                       u.full_name as customer_name, p.name as pet_name, svc.name as service_name,
                       clinician.full_name as staff_name, i.preferred_staff_id, preferred.full_name as preferred_staff_name, i.status, i.checked_in_at
                from booking_items i join bookings b on b.id = i.booking_id
                join time_slots t on t.id = i.time_slot_id
                join users u on u.id = b.customer_id join pets p on p.id = b.pet_id
                join services svc on svc.id = i.service_id
                left join staff s on s.id = i.staff_id left join users clinician on clinician.id = s.user_id
                left join staff pref on pref.id = i.preferred_staff_id left join users preferred on preferred.id = pref.user_id
                where i.status <> 'CANCELLED' and t.start_time >= :start
                """;
        var range = pending ? " and i.staff_id is null and i.status in ('PENDING','CONFIRMED') " : " and t.start_time < :end ";
        var query = jdbc.sql(sql + range + (assignedUser == null ? "" : " and s.user_id = :userId ")
                        + " order by t.start_time, i.id")
                .param("start", Timestamp.from(date.atStartOfDay(ZONE).toInstant()));
        if (!pending) query = query.param("end", Timestamp.from(date.plusDays(1).atStartOfDay(ZONE).toInstant()));
        if (assignedUser != null) query = query.param("userId", assignedUser);
        return query.query(Visit.class).list();
    }

    public List<ClientPet> findClientPets(String contact) {
        return jdbc.sql("""
                select u.id as customer_id, u.full_name as customer_name, p.id, p.name, p.species
                from users u join pets p on p.owner_id = u.id
                where (lower(u.email) = lower(:contact) or u.phone = :contact) and p.is_active
                order by p.name, p.id
                """).param("contact", contact.trim()).query(ClientPet.class).list();
    }
}
