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
import com.petcare.platform.staff.repository.StaffSkillRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ScheduleService {

    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final int MAX_SLOTS_PER_SCHEDULE = 200;

    private final ScheduleRepository scheduleRepository;
    private final TimeSlotRepository timeSlotRepository;
    private final StaffRepository staffRepository;
    private final StaffSkillRepository skillRepository;
    private final CareServiceRepository careServiceRepository;

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
        AvailableSlotsResponse empty = new AvailableSlotsResponse(date, ZONE.getId(), List.of());

        Integer requiredMinutes = null;
        if (serviceId != null) {
            requiredMinutes = careServiceRepository.findByIdAndActiveTrue(serviceId)
                    .orElseThrow(() -> new ResourceNotFoundException("Service", serviceId))
                    .getDurationMinutes();
        }
        final Integer neededMinutes = requiredMinutes;

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

        Map<UUID, Set<UUID>> skillsByStaff = new HashMap<>();
        skillRepository.findByStaffIdIn(staffById.keySet()).forEach(skill ->
                skillsByStaff.computeIfAbsent(skill.getStaffId(), k -> new HashSet<>())
                        .add(skill.getServiceId()));

        List<Schedule> usable = schedules.stream()
                .filter(s -> staffById.containsKey(s.getStaffId()))
                .filter(s -> serviceId == null
                        || skillsByStaff.getOrDefault(s.getStaffId(), Set.of()).contains(serviceId))
                .toList();
        if (usable.isEmpty()) {
            return empty;
        }

        Map<UUID, List<TimeSlot>> slotsBySchedule = timeSlotRepository
                .findByScheduleIdInOrderByStartTimeAsc(usable.stream().map(Schedule::getId).toList())
                .stream()
                .collect(Collectors.groupingBy(TimeSlot::getScheduleId));

        Instant now = Instant.now();
        List<StaffSlots> result = new ArrayList<>();
        for (Schedule schedule : usable) {
            List<UUID> skillIds = List.copyOf(
                    skillsByStaff.getOrDefault(schedule.getStaffId(), Set.of()));

            List<SlotView> views = slotsBySchedule.getOrDefault(schedule.getId(), List.of()).stream()
                    .filter(t -> t.getStartTime().isAfter(now))
                    .filter(t -> includeBooked || !t.isBooked())
                    .filter(t -> neededMinutes == null
                            || Duration.between(t.getStartTime(), t.getEndTime()).toMinutes() == neededMinutes)
                    .map(t -> new SlotView(
                            t.getId(),
                            t.getStartTime().atZone(ZONE).toOffsetDateTime(),
                            t.getEndTime().atZone(ZONE).toOffsetDateTime(),
                            !t.isBooked(),
                            skillIds,
                            t.getResourceId()))
                    .toList();

            if (!views.isEmpty()) {
                result.add(new StaffSlots(schedule.getStaffId(), schedule.getId(),
                        schedule.getStartTime(), schedule.getEndTime(), views));
            }
        }
        return new AvailableSlotsResponse(date, ZONE.getId(), result);
    }

    private ScheduleResponse toResponse(Schedule s) {
        return new ScheduleResponse(s.getId(), s.getStaffId(), s.getWorkDate(),
                s.getStartTime(), s.getEndTime(), s.isAvailable(),
                s.getCreatedAt(), s.getUpdatedAt());
    }
}