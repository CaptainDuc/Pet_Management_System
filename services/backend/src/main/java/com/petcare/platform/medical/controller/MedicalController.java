package com.petcare.platform.medical.controller;

import com.petcare.platform.common.security.UserPrincipal;
import com.petcare.platform.medical.domain.MedicalRecord;
import com.petcare.platform.medical.domain.Vaccination;
import com.petcare.platform.medical.service.MedicalService;
import lombok.RequiredArgsConstructor;
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

    @GetMapping("/records/pet/{petId}")
    @PreAuthorize("hasAuthority('medical:read')")
    public ResponseEntity<List<MedicalRecord>> getRecords(
            @AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID petId) {
        return ResponseEntity.ok(medicalService.getRecordsByPet(principal.getId(), petId));
    }

    @GetMapping("/vaccinations/pet/{petId}")
    @PreAuthorize("hasAuthority('medical:read')")
    public ResponseEntity<List<Vaccination>> getVaccinations(
            @AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID petId) {
        return ResponseEntity.ok(medicalService.getVaccinationsByPet(principal.getId(), petId));
    }
}