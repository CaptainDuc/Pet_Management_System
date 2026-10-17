package com.petcare.platform.medical.service;

import com.petcare.platform.medical.domain.MedicalRecord;
import com.petcare.platform.medical.domain.Vaccination;
import com.petcare.platform.medical.repository.MedicalRecordRepository;
import com.petcare.platform.medical.repository.VaccinationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MedicalService {

    private final MedicalRecordRepository medicalRecordRepository;
    private final VaccinationRepository vaccinationRepository;

    public List<MedicalRecord> getRecordsByPet(UUID petId) {
        return medicalRecordRepository.findByPetId(petId);
    }

    public List<Vaccination> getVaccinationsByPet(UUID petId) {
        return vaccinationRepository.findByPetId(petId);
    }
}
