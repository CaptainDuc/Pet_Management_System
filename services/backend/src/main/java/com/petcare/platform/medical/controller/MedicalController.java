package com.petcare.platform.medical.controller;

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
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
    public ResponseEntity<List<MedicalRecord>> getRecords(
            @AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID petId) {
        return ResponseEntity.ok(medicalService.getRecordsByPet(principal.getId(), petId));
    }

    @GetMapping("/records/{id}")
    @PreAuthorize("hasAuthority('medical:read')")
    public ResponseEntity<MedicalRecord> getRecord(
            @AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id) {
        return ResponseEntity.ok(medicalService.getRecord(principal.getId(), id));
    }

    @PostMapping("/records")
    @PreAuthorize("hasAuthority('medical:create')")
    public ResponseEntity<MedicalRecord> createRecord(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateMedicalRecordRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(medicalService.createRecord(principal, request));
    }

    @PutMapping("/records/{id}")
    @PreAuthorize("hasAuthority('medical:update')")
    public ResponseEntity<MedicalRecord> updateRecord(
            @AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id,
            @Valid @RequestBody UpdateMedicalRecordRequest request) {
        return ResponseEntity.ok(medicalService.updateRecord(principal.getId(), id, request));
    }

    // ─── Sổ tiêm phòng ─────────────────────────────────────────────────────

    @GetMapping("/vaccinations/pet/{petId}")
    @PreAuthorize("hasAuthority('medical:read')")
    public ResponseEntity<List<Vaccination>> getVaccinations(
            @AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID petId) {
        return ResponseEntity.ok(medicalService.getVaccinationsByPet(principal.getId(), petId));
    }

    @GetMapping("/vaccinations/due")
    @PreAuthorize("hasAuthority('medical:read')")
    public ResponseEntity<List<Vaccination>> dueVaccinations(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "30") int days) {
        return ResponseEntity.ok(medicalService.dueVaccinations(principal.getId(), days));
    }

    @PostMapping("/vaccinations")
    @PreAuthorize("hasAuthority('medical:create')")
    public ResponseEntity<Vaccination> createVaccination(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateVaccinationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(medicalService.createVaccination(principal, request));
    }

    @PutMapping("/vaccinations/{id}")
    @PreAuthorize("hasAuthority('medical:update')")
    public ResponseEntity<Vaccination> updateVaccination(
            @AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id,
            @Valid @RequestBody UpdateVaccinationRequest request) {
        return ResponseEntity.ok(medicalService.updateVaccination(principal.getId(), id, request));
    }
}