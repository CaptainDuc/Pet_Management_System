package com.petcare.platform.schedule.repository;

import com.petcare.platform.schedule.domain.TimeSlot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface TimeSlotRepository extends JpaRepository<TimeSlot, UUID> {

    List<TimeSlot> findByScheduleIdInOrderByStartTimeAsc(Collection<UUID> scheduleIds);
}