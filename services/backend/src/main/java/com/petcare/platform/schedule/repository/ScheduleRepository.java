package com.petcare.platform.schedule.repository;

import com.petcare.platform.schedule.domain.Schedule;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface ScheduleRepository extends JpaRepository<Schedule, UUID> {

    @Lock(LockModeType.PESSIMISTIC_READ)
    @Query("select s from Schedule s where s.id = :id")
    Optional<Schedule> lockForBooking(UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from Schedule s where s.id = :id")
    Optional<Schedule> lockForUpdate(UUID id);

    boolean existsByStaffIdAndWorkDate(UUID staffId, LocalDate workDate);

    List<Schedule> findByWorkDateAndAvailableTrue(LocalDate workDate);

    List<Schedule> findByWorkDateBetweenOrderByWorkDateAscStartTimeAsc(LocalDate from, LocalDate to);
}
