package com.petcare.platform.staff.controller;

import com.petcare.platform.common.dto.ApiResponse;
import com.petcare.platform.common.dto.PageResponse;
import com.petcare.platform.staff.dto.AssignSkillsRequest;
import com.petcare.platform.staff.dto.CreateStaffRequest;
import com.petcare.platform.staff.dto.SetActiveRequest;
import com.petcare.platform.staff.dto.StaffResponse;
import com.petcare.platform.staff.dto.StaffSkillsResponse;
import com.petcare.platform.staff.service.StaffService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/staff")
@RequiredArgsConstructor
@Tag(name = "Staff", description = "Hồ sơ nhân viên và kỹ năng")
public class StaffController {

    private final StaffService staffService;

    @PostMapping
    @PreAuthorize("hasAuthority('staff:write')")
    public ResponseEntity<ApiResponse<StaffResponse>> create(
            @Valid @RequestBody CreateStaffRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(staffService.create(request)));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('staff:read')")
    public ResponseEntity<ApiResponse<PageResponse<StaffResponse>>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(
                Math.max(page, 0), Math.min(Math.max(size, 1), 50),
                Sort.by("createdAt").descending());
        return ResponseEntity.ok(ApiResponse.ok(PageResponse.from(staffService.list(pageable))));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('staff:read')")
    public ResponseEntity<ApiResponse<StaffResponse>> get(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(staffService.get(id)));
    }

    @PatchMapping("/{id}/active")
    @PreAuthorize("hasAuthority('staff:write')")
    public ResponseEntity<ApiResponse<StaffResponse>> setActive(
            @PathVariable UUID id, @Valid @RequestBody SetActiveRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(staffService.setActive(id, request.isActive())));
    }

    @PostMapping("/{id}/skills")
    @PreAuthorize("hasAuthority('staff:write')")
    public ResponseEntity<ApiResponse<StaffSkillsResponse>> assignSkills(
            @PathVariable UUID id, @Valid @RequestBody AssignSkillsRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(staffService.assignSkills(id, request)));
    }

    @GetMapping("/{id}/skills")
    @PreAuthorize("hasAuthority('staff:read')")
    public ResponseEntity<ApiResponse<StaffSkillsResponse>> listSkills(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(staffService.listSkills(id)));
    }
}