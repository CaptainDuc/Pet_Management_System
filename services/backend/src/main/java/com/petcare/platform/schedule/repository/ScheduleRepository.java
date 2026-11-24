package com.petcare.platform.schedule.repository;

import com.petcare.platform.schedule.domain.Schedule;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

public interface ScheduleRepository extends JpaRepository<Schedule, UUID> {

    @Lock(LockModeType.PESSIMISTIC_READ)
    @Query("select s from Schedule s where s.id = :id")
    Optional<Schedule> lockForBooking(UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from Schedule s where s.id = :id")
    Optional<Schedule> lockForUpdate(UUID id);

    @Query("select s from Schedule s join Staff st on st.id=s.staffId where st.userId=:user and st.active=true and s.workDate=:date")
    Optional<Schedule> personalShift(UUID user, LocalDate date);

    @org.springframework.data.jpa.repository.Modifying
    @Query(value = """
            update schedules set clocked_out_at=(work_date + end_time) at time zone 'Asia/Ho_Chi_Minh', version=version+1
            where clocked_in_at is not null and clocked_out_at is null
              and ((work_date + end_time) at time zone 'Asia/Ho_Chi_Minh') <= now()
            """, nativeQuery = true)
    int finishDueAttendance();

    boolean existsByStaffIdAndWorkDate(UUID staffId, LocalDate workDate);

    boolean existsByStaffIdAndWorkDateAndStartTimeAndEndTime(UUID staffId, LocalDate workDate, LocalTime startTime, LocalTime endTime);

    List<Schedule> findByWorkDateAndAvailableTrue(LocalDate workDate);

    List<Schedule> findByWorkDateBetweenOrderByWorkDateAscStartTimeAsc(LocalDate from, LocalDate to);
}
