package com.petcare.platform.schedule.repository;

import com.petcare.platform.schedule.domain.Schedule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface ScheduleRepository extends JpaRepository<Schedule, UUID> {

    boolean existsByStaffIdAndWorkDate(UUID staffId, LocalDate workDate);

    List<Schedule> findByWorkDateAndAvailableTrue(LocalDate workDate);

    List<Schedule> findByWorkDateBetweenOrderByWorkDateAscStartTimeAsc(LocalDate from, LocalDate to);
}