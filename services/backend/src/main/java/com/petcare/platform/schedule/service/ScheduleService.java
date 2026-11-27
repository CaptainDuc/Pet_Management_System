package com.petcare.platform.schedule.service;

import com.petcare.platform.common.exception.BusinessException;
import com.petcare.platform.common.exception.ResourceNotFoundException;
import com.petcare.platform.schedule.domain.Schedule;
import com.petcare.platform.schedule.domain.TimeSlot;
import com.petcare.platform.schedule.dto.AvailableSlotsResponse;
import com.petcare.platform.schedule.dto.AvailableSlotsResponse.SlotView;
import com.petcare.platform.schedule.dto.AvailableSlotsResponse.StaffSlots;
import com.petcare.platform.schedule.dto.CreateScheduleRequest;
import com.petcare.platform.schedule.dto.ScheduleResponse;
import com.petcare.platform.schedule.repository.ScheduleRepository;
import com.petcare.platform.schedule.repository.TimeSlotRepository;
import com.petcare.platform.servicecatalog.repository.CareServiceRepository;
import com.petcare.platform.staff.domain.Staff;
import com.petcare.platform.staff.repository.StaffRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ScheduleService {

    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final int MAX_SLOTS_PER_SCHEDULE = 200;

    // Ca làm việc chuẩn hóa cho tất cả bác sĩ
    private static final LocalTime SHIFT_START = LocalTime.of(8, 0);
    private static final LocalTime SHIFT_END = LocalTime.of(16, 30);

    private final ScheduleRepository scheduleRepository;
    private final TimeSlotRepository timeSlotRepository;
    private final StaffRepository staffRepository;
    private final CareServiceRepository careServiceRepository;

    public record Attendance(UUID shiftId, Instant start, Instant end, Instant clockIn, Instant clockOut, boolean open) {}

    private Attendance attendance(Schedule shift) {
        var day = shift.getWorkDate();
        return new Attendance(shift.getId(), day.atTime(shift.getStartTime()).atZone(ZONE).toInstant(),
                day.atTime(shift.getEndTime()).atZone(ZONE).toInstant(), shift.getClockedInAt(),
                shift.getClockedOutAt(), shift.isAvailable());
    }

    public Attendance today(UUID user) {
        return scheduleRepository.personalShift(user, LocalDate.now(ZONE)).map(this::attendance).orElse(null);
    }

    @Transactional
    public Attendance clock(UUID user, UUID shiftId, boolean working, boolean confirmEarly) {
        var shift = scheduleRepository.lockForUpdate(shiftId).orElseThrow(() -> new ResourceNotFoundException("Schedule", shiftId));
        if (scheduleRepository.personalShift(user, LocalDate.now(ZONE)).filter(s -> s.getId().equals(shiftId)).isEmpty()) {
            throw new BusinessException("Ca làm không thuộc lịch hôm nay của bạn.");
        }
        var state = attendance(shift);
        var now = Instant.now();
        if (working) {
            if (!state.open() || now.isBefore(state.start()) || !now.isBefore(state.end()) || state.clockOut() != null) {
                throw new BusinessException("Ca làm chưa bắt đầu hoặc đã kết thúc.");
            }
            if (state.clockIn() == null) shift.setClockedInAt(now);
        } else if (state.clockIn() != null && state.clockOut() == null) {
            if (now.isBefore(state.end())) {
                if (!confirmEarly) throw new BusinessException("Vui lòng xác nhận tan ca sớm.");
                shift.setAvailable(false);
                shift.setClockedOutAt(now);
            } else shift.setClockedAtEnd(state.end());
        }
        return attendance(shift);
    }

    /**
     * Tự động tạo lịch làm việc chuẩn cho tất cả bác sĩ hoạt động trong ngày
     */
    @Transactional
    public void ensureStandardShiftsForDate(LocalDate date) {
        var doctors = staffRepository.doctors().stream()
                .filter(d -> Boolean.TRUE.equals(d.getStaffActive()) && "ACTIVE".equals(d.getAccountStatus()))
                .toList();

        for (var doctor : doctors) {
            if (scheduleRepository.existsByStaffIdAndWorkDate(doctor.getStaffId(), date)) continue;
            var schedule = new Schedule();
            schedule.setStaffId(doctor.getStaffId());
            schedule.setWorkDate(date);
            schedule.setStartTime(SHIFT_START);
            schedule.setEndTime(SHIFT_END);
            schedule.setAvailable(true);
            scheduleRepository.save(schedule);
            createTimeSlotsForSchedule(schedule, 30);
        }
    }

    private void createTimeSlotsForSchedule(Schedule schedule, int slotDurationMinutes) {
        List<TimeSlot> slots = new ArrayList<>();
        LocalDateTime cursor = LocalDateTime.of(schedule.getWorkDate(), schedule.getStartTime());
        LocalDateTime end = LocalDateTime.of(schedule.getWorkDate(), schedule.getEndTime());
        while (!cursor.plusMinutes(slotDurationMinutes).isAfter(end)) {
            TimeSlot slot = new TimeSlot();
            slot.setScheduleId(schedule.getId());
            slot.setStartTime(cursor.atZone(ZONE).toInstant());
            slot.setEndTime(cursor.plusMinutes(slotDurationMinutes).atZone(ZONE).toInstant());
            slots.add(slot);
            cursor = cursor.plusMinutes(slotDurationMinutes);
        }
        timeSlotRepository.saveAll(slots);
    }

    @org.springframework.scheduling.annotation.Scheduled(fixedDelay = 15000)
    @Transactional
    public void closeEndedShifts() {
        scheduleRepository.finishDueAttendance();
    }

    /**
     * Tự động tạo ca làm việc chuẩn cho 7 ngày tới (chạy hàng ngày lúc 00:05)
     */
    @org.springframework.scheduling.annotation.Scheduled(cron = "0 5 0 * * *", zone = "Asia/Ho_Chi_Minh")
    @Transactional
    public void ensureStandardShiftsForUpcomingDays() {
        for (int i = 0; i < 7; i++) {
            ensureStandardShiftsForDate(LocalDate.now(ZONE).plusDays(i));
        }
    }

    // Tạo ca làm việc và sinh các khung giờ trong cùng một giao dịch
    @Transactional
    public ScheduleResponse create(CreateScheduleRequest r) {
        staffRepository.findByIdAndActiveTrue(r.staffId())
                .orElseThrow(() -> new ResourceNotFoundException("Staff", r.staffId()));

        if (!r.startTime().isBefore(r.endTime())) {
            throw new BusinessException("startTime must be before endTime");
        }
        if (r.workDate().isBefore(LocalDate.now(ZONE))) {
            throw new BusinessException("workDate must not be in the past");
        }
        if (scheduleRepository.existsByStaffIdAndWorkDate(r.staffId(), r.workDate())) {
            throw new BusinessException("Schedule already exists for this staff and date");
        }

        int duration = r.slotDurationMinutes();
        long workMinutes = Duration.between(r.startTime(), r.endTime()).toMinutes();
        if (workMinutes < duration) {
            throw new BusinessException("Work period is shorter than one slot");
        }
        if (workMinutes / duration > MAX_SLOTS_PER_SCHEDULE) {
            throw new BusinessException("Too many slots for one schedule");
        }

        Schedule schedule = new Schedule();
        schedule.setStaffId(r.staffId());
        schedule.setWorkDate(r.workDate());
        schedule.setStartTime(r.startTime());
        schedule.setEndTime(r.endTime());
        schedule.setAvailable(r.isAvailable() == null || r.isAvailable());
        schedule = scheduleRepository.save(schedule);

        List<TimeSlot> slots = new ArrayList<>();
        LocalDateTime cursor = LocalDateTime.of(r.workDate(), r.startTime());
        LocalDateTime end = LocalDateTime.of(r.workDate(), r.endTime());
        while (!cursor.plusMinutes(duration).isAfter(end)) {
            TimeSlot slot = new TimeSlot();
            slot.setScheduleId(schedule.getId());
            slot.setStartTime(cursor.atZone(ZONE).toInstant());
            slot.setEndTime(cursor.plusMinutes(duration).atZone(ZONE).toInstant());
            slots.add(slot);
            cursor = cursor.plusMinutes(duration);
        }
        timeSlotRepository.saveAll(slots);

        return toResponse(schedule);
    }

    @Transactional(readOnly = true)
    public List<ScheduleResponse> list(UUID staffId, LocalDate from, LocalDate to) {
        return scheduleRepository.findByWorkDateBetweenOrderByWorkDateAscStartTimeAsc(from, to).stream()
                .filter(s -> staffId == null || s.getStaffId().equals(staffId))
                .map(this::toResponse)
                .toList();
    }

    // Khung giờ còn trống của một ngày, có thể lọc theo nhân viên, chi nhánh, dịch vụ
    @Transactional(readOnly = true)
    public AvailableSlotsResponse availableSlots(LocalDate date, UUID staffId, UUID branchId,
                                                 UUID serviceId, boolean includeBooked) {


        Integer requiredMinutes = null;
        if (serviceId != null) {
            requiredMinutes = careServiceRepository.findByIdAndActiveTrue(serviceId)
                    .orElseThrow(() -> new ResourceNotFoundException("Service", serviceId))
                    .getDurationMinutes();
        }
        return availableSlots(date, staffId, branchId, serviceId, includeBooked, requiredMinutes, Set.of());
    }

    public AvailableSlotsResponse availableSlots(LocalDate date, UUID staffId, UUID branchId,
            UUID serviceId, boolean includeBooked, Integer neededMinutes, Set<UUID> alreadyHeld) {
        AvailableSlotsResponse empty = new AvailableSlotsResponse(date, ZONE.getId(), List.of());

        List<Schedule> schedules = scheduleRepository.findByWorkDateAndAvailableTrue(date).stream()
                .filter(s -> staffId == null || s.getStaffId().equals(staffId))
                .toList();
        if (schedules.isEmpty()) {
            return empty;
        }

        Map<UUID, Staff> staffById = staffRepository
                .findByIdInAndActiveTrue(schedules.stream().map(Schedule::getStaffId).distinct().toList())
                .stream()
                .filter(st -> branchId == null || branchId.equals(st.getBranchId()))
                .collect(Collectors.toMap(Staff::getId, st -> st));
        if (staffById.isEmpty()) {
            return empty;
        }

        Map<UUID, Set<UUID>> servicesByStaff = new HashMap<>();
        staffRepository.availableServices(staffById.keySet()).forEach(skill ->
                servicesByStaff.computeIfAbsent(skill.getStaffId(), k -> new HashSet<>())
                        .add(skill.getServiceId()));

        List<Schedule> usable = schedules.stream()
                .filter(s -> staffById.containsKey(s.getStaffId()))
                .filter(s -> serviceId == null
                        || servicesByStaff.getOrDefault(s.getStaffId(), Set.of()).contains(serviceId))
                .toList();
        if (usable.isEmpty()) {
            return empty;
        }

        Map<UUID, List<TimeSlot>> slotsBySchedule = timeSlotRepository
                .findByScheduleIdInOrderByStartTimeAsc(usable.stream().map(s -> s.getId()).toList())
                .stream()
                .collect(Collectors.groupingBy(TimeSlot::getScheduleId));

        var directory = staffRepository.directoryById(staffById.keySet()).stream()
                .filter(StaffRepository.DirectoryEntry::getActive)
                .collect(Collectors.toMap(StaffRepository.DirectoryEntry::getId, entry -> entry));
        Instant now = Instant.now();
        List<StaffSlots> result = new ArrayList<>();
        for (Schedule schedule : usable) {
            var worker = directory.get(schedule.getStaffId());
            if (worker == null) continue;
            List<UUID> serviceIds = List.copyOf(
                    servicesByStaff.getOrDefault(schedule.getStaffId(), Set.of()));

            List<TimeSlot> ordered = slotsBySchedule.getOrDefault(schedule.getId(), List.of());
            List<SlotView> views = new ArrayList<>();
            for (TimeSlot first : ordered) {
                if (!first.getStartTime().isAfter(now)) continue;
                List<TimeSlot> window = neededMinutes == null ? List.of(first)
                        : SlotWindow.covering(ordered, first, neededMinutes);
                if (window.isEmpty()) continue;
                boolean available = window.stream().noneMatch(s -> s.isBooked() && !alreadyHeld.contains(s.getId()));
                if (!includeBooked && !available) continue;
                views.add(new SlotView(first.getId(), first.getStartTime().atZone(ZONE).toOffsetDateTime(),
                        window.getLast().getEndTime().atZone(ZONE).toOffsetDateTime(), available,
                        serviceIds, first.getResourceId()));
            }

            if (!views.isEmpty()) {
                result.add(new StaffSlots(schedule.getStaffId(), schedule.getId(), worker.getFullName(),
                        staffById.get(schedule.getStaffId()).getBranchId(), worker.getBranchName(),
                        schedule.getStartTime(), schedule.getEndTime(), views));
            }
        }
        return new AvailableSlotsResponse(date, ZONE.getId(), result);
    }

    /**
     * Lấy danh sách bác sĩ khả dụng cho một khung giờ cụ thể
     * Chỉ trả về bác sĩ có slot trống (chưa được đặt) tại thời điểm đó
     */
    @Transactional(readOnly = true)
    public List<AvailableDoctor> availableDoctorsForSlot(LocalDate date, Instant slotStart, Instant slotEnd,
                                                          UUID serviceId, UUID branchId) {
        // Lấy tất cả bác sĩ đang trực ca chứa khung giờ này
        var schedules = scheduleRepository.findByWorkDateAndAvailableTrue(date).stream()
                .filter(s -> {
                    var shiftStart = date.atTime(s.getStartTime()).atZone(ZONE).toInstant();
                    var shiftEnd = date.atTime(s.getEndTime()).atZone(ZONE).toInstant();
                    return !slotStart.isBefore(shiftStart) && !slotEnd.isAfter(shiftEnd);
                })
                .toList();

        if (schedules.isEmpty()) return List.of();

        var staffIds = schedules.stream().map(Schedule::getStaffId).distinct().toList();
        var staffById = staffRepository.findByIdInAndActiveTrue(staffIds).stream()
                .filter(st -> branchId == null || branchId.equals(st.getBranchId()))
                .collect(Collectors.toMap(Staff::getId, st -> st));

        // Lọc bác sĩ có kỹ năng dịch vụ
        if (serviceId != null) {
            var serviceSkills = staffRepository.availableServices(staffById.keySet()).stream()
                    .filter(skill -> skill.getServiceId().equals(serviceId))
                    .collect(Collectors.toMap(
                            com.petcare.platform.staff.repository.StaffRepository.StaffServiceEntry::getStaffId,
                            com.petcare.platform.staff.repository.StaffRepository.StaffServiceEntry::getServiceId,
                            (a, b) -> a
                    ));
            staffById.keySet().retainAll(serviceSkills.keySet());
        }

        // Lấy các slot đã được đặt trong khung giờ này
        var scheduleIds = schedules.stream().map(Schedule::getId).toList();
        var bookedSlotIds = timeSlotRepository.findBookedSlotsInRange(scheduleIds, slotStart, slotEnd);
        var bookedStaffIds = bookedSlotIds.stream()
                .map(slotId -> {
                    var slot = timeSlotRepository.findById(slotId).orElse(null);
                    return slot != null ? slot.getScheduleId() : null;
                })
                .filter(Objects::nonNull)
                .map(scheduleId -> {
                    var sched = schedules.stream().filter(s -> s.getId().equals(scheduleId)).findFirst().orElse(null);
                    return sched != null ? sched.getStaffId() : null;
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        var directory = staffRepository.directoryById(staffById.keySet()).stream()
                .filter(StaffRepository.DirectoryEntry::getActive)
                .collect(Collectors.toMap(StaffRepository.DirectoryEntry::getId, entry -> entry));

        return schedules.stream()
                .filter(s -> staffById.containsKey(s.getStaffId()))
                .filter(s -> !bookedStaffIds.contains(s.getStaffId()))
                .map(s -> {
                    var worker = directory.get(s.getStaffId());
                    return new AvailableDoctor(
                            s.getStaffId(),
                            s.getId(),
                            worker != null ? worker.getFullName() : "Bác sĩ",
                            staffById.get(s.getStaffId()).getBranchId(),
                            worker != null ? worker.getBranchName() : "",
                            s.getStartTime(),
                            s.getEndTime()
                    );
                })
                .distinct()
                .toList();
    }

    public record AvailableDoctor(UUID staffId, UUID scheduleId, String staffName,
                                  UUID branchId, String branchName,
                                  LocalTime shiftStart, LocalTime shiftEnd) {}

    @Transactional
    public ScheduleResponse setAvailability(UUID id, boolean available) {
        Schedule shift = scheduleRepository.lockForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Schedule", id));
        shift.setAvailable(available);
        return toResponse(shift);
    }

    @Transactional
    public void delete(UUID id) {
        Schedule shift = scheduleRepository.lockForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Schedule", id));
        // Delete associated time slots first
        timeSlotRepository.deleteByScheduleId(id);
        scheduleRepository.delete(shift);
    }

    private ScheduleResponse toResponse(Schedule s) {
        return new ScheduleResponse(s.getId(), s.getStaffId(), s.getWorkDate(),
                s.getStartTime(), s.getEndTime(), s.isAvailable(),
                s.getCreatedAt(), s.getUpdatedAt());
    }
}
