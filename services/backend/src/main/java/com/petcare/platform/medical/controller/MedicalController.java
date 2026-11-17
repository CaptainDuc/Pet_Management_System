package com.petcare.platform.medical.controller;

import com.petcare.platform.common.dto.ApiResponse;
import com.petcare.platform.common.security.UserPrincipal;
import com.petcare.platform.medical.domain.MedicalRecord;
import com.petcare.platform.medical.domain.Vaccination;
import com.petcare.platform.medical.dto.CreateMedicalRecordRequest;
import com.petcare.platform.medical.dto.CreateVaccinationRequest;
import com.petcare.platform.medical.dto.UpdateMedicalRecordRequest;
import com.petcare.platform.medical.dto.UpdateVaccinationRequest;
import com.petcare.platform.medical.service.MedicalService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/medical")
@RequiredArgsConstructor
public class MedicalController {

    private final MedicalService medicalService;

    // ─── Hồ sơ khám ────────────────────────────────────────────────────────

    @GetMapping("/records/pet/{petId}")
    @PreAuthorize("hasAuthority('medical:read')")
    public ApiResponse<List<MedicalRecord>> getRecords(
            @AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID petId) {
        return ApiResponse.ok(medicalService.getRecordsByPet(principal.getId(), petId));
    }

    @GetMapping("/records/{id}")
    @PreAuthorize("hasAuthority('medical:read')")
    public ApiResponse<MedicalRecord> getRecord(
            @AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id) {
        return ApiResponse.ok(medicalService.getRecord(principal.getId(), id));
    }

    @PostMapping("/records")
    @PreAuthorize("hasAuthority('medical:create')")
    public ApiResponse<MedicalRecord> createRecord(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateMedicalRecordRequest request) {
        return ApiResponse.created(medicalService.createRecord(principal, request));
    }

    @PutMapping("/records/{id}")
    @PreAuthorize("hasAuthority('medical:update')")
    public ApiResponse<MedicalRecord> updateRecord(
            @AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id,
            @Valid @RequestBody UpdateMedicalRecordRequest request) {
        return ApiResponse.ok(medicalService.updateRecord(principal.getId(), id, request));
    }

    // ─── Sổ tiêm phòng ─────────────────────────────────────────────────────

    @GetMapping("/vaccinations/pet/{petId}")
    @PreAuthorize("hasAuthority('medical:read')")
    public ApiResponse<List<Vaccination>> getVaccinations(
            @AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID petId) {
        return ApiResponse.ok(medicalService.getVaccinationsByPet(principal.getId(), petId));
    }

    @GetMapping("/vaccinations/due")
    @PreAuthorize("hasAuthority('medical:read')")
    public ApiResponse<List<Vaccination>> dueVaccinations(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "30") int days) {
        return ApiResponse.ok(medicalService.dueVaccinations(principal.getId(), days));
    }

    @PostMapping("/vaccinations")
    @PreAuthorize("hasAuthority('medical:create')")
    public ApiResponse<Vaccination> createVaccination(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateVaccinationRequest request) {
        return ApiResponse.created(medicalService.createVaccination(principal, request));
    }

    @PutMapping("/vaccinations/{id}")
    @PreAuthorize("hasAuthority('medical:update')")
    public ApiResponse<Vaccination> updateVaccination(
            @AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id,
            @Valid @RequestBody UpdateVaccinationRequest request) {
        return ApiResponse.ok(medicalService.updateVaccination(principal.getId(), id, request));
    }
}