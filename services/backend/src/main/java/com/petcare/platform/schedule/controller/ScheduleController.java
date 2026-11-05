package com.petcare.platform.schedule.controller;

import com.petcare.platform.common.dto.ApiResponse;
import com.petcare.platform.schedule.dto.AvailableSlotsResponse;
import com.petcare.platform.schedule.dto.CreateScheduleRequest;
import com.petcare.platform.schedule.dto.ScheduleResponse;
import com.petcare.platform.schedule.service.ScheduleService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/schedules")
@RequiredArgsConstructor
@Tag(name = "Schedules", description = "Ca làm việc và khung giờ trống")
public class ScheduleController {

    private final ScheduleService scheduleService;

    @PostMapping
    @PreAuthorize("hasAuthority('schedule:write')")
    public ResponseEntity<ApiResponse<ScheduleResponse>> create(
            @Valid @RequestBody CreateScheduleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(scheduleService.create(request)));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('schedule:read')")
    public ResponseEntity<ApiResponse<List<ScheduleResponse>>> list(
            @RequestParam(required = false) UUID staffId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo) {
        return ResponseEntity.ok(ApiResponse.ok(scheduleService.list(staffId, dateFrom, dateTo)));
    }

    // Mọi người dùng đã đăng nhập đều xem được khung giờ trống
    @GetMapping("/slots/available")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<AvailableSlotsResponse>> availableSlots(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) UUID staffId,
            @RequestParam(required = false) UUID branchId,
            @RequestParam(required = false) UUID serviceId,
            @RequestParam(defaultValue = "false") boolean includeBooked) {
        return ResponseEntity.ok(ApiResponse.ok(
                scheduleService.availableSlots(date, staffId, branchId, serviceId, includeBooked)));
    }
}