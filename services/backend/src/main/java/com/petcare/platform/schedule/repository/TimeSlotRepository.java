package com.petcare.platform.schedule.repository;

import com.petcare.platform.schedule.domain.TimeSlot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface TimeSlotRepository extends JpaRepository<TimeSlot, UUID> {

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