package com.petcare.platform.medical.controller;

import com.petcare.platform.medical.domain.MedicalRecord;
import com.petcare.platform.medical.domain.Vaccination;
import com.petcare.platform.medical.service.MedicalService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/medical")
@RequiredArgsConstructor
public class MedicalController {

    private final MedicalService medicalService;

    @GetMapping("/records/pet/{petId}")
    public ResponseEntity<List<MedicalRecord>> getRecords(@PathVariable UUID petId) {
        return ResponseEntity.ok(medicalService.getRecordsByPet(petId));
    }

    @GetMapping("/vaccinations/pet/{petId}")
    public ResponseEntity<List<Vaccination>> getVaccinations(@PathVariable UUID petId) {
        return ResponseEntity.ok(medicalService.getVaccinationsByPet(petId));
    }
}
