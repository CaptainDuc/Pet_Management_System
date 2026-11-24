package com.petcare.platform.schedule.repository;

import com.petcare.platform.schedule.domain.TimeSlot;
import com.petcare.platform.staff.repository.StaffRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface TimeSlotRepository extends JpaRepository<TimeSlot, UUID> {

    interface Candidate {
        UUID getSlotId();
        UUID getScheduleId();
        UUID getStaffId();
        String getStaffName();
        UUID getBranchId();
    }

    @Query("""
            select t.id as slotId, s.id as scheduleId, st.id as staffId, u.fullName as staffName,
                   st.branchId as branchId from TimeSlot t join Schedule s on s.id = t.scheduleId
            join Staff st on st.id = s.staffId join User u on u.id = st.userId
            join CareService c on c.id = :serviceId and c.active = true
            """ + StaffRepository.SERVICE_SKILL_JOIN + """
            where t.startTime = :start and s.available = true and st.active = true and u.status = 'ACTIVE'
              and
            """ + StaffRepository.PROVIDES_SERVICE + " order by s.id, t.id")
    List<Candidate> candidates(java.time.Instant start, UUID serviceId);

    @Query(value = "select id from time_slots where id in (:ids) and not is_booked order by id for update", nativeQuery = true)
    List<UUID> lockFreeSlots(@Param("ids") Collection<UUID> ids);

    List<TimeSlot> findByScheduleIdInOrderByStartTimeAsc(Collection<UUID> scheduleIds);

    // Giữ chỗ nguyên tử: trả 0 nghĩa là khung giờ đã có người giữ
    @Modifying
    @Query("update TimeSlot t set t.booked = true where t.id = :id and t.booked = false")
    int markBooked(@Param("id") UUID id);

    // Trả chỗ khi hủy lịch
    @Modifying
    @Query("update TimeSlot t set t.booked = false where t.id in :ids")
    int release(@Param("ids") Collection<UUID> ids);
}
