package com.petcare.platform.medical.service;

import com.petcare.platform.common.exception.BusinessException;
import com.petcare.platform.common.exception.ResourceNotFoundException;
import com.petcare.platform.common.security.UserPrincipal;
import com.petcare.platform.medical.domain.MedicalRecord;
import com.petcare.platform.medical.domain.Vaccination;
import com.petcare.platform.medical.dto.CreateMedicalRecordRequest;
import com.petcare.platform.medical.dto.CreateVaccinationRequest;
import com.petcare.platform.medical.dto.UpdateMedicalRecordRequest;
import com.petcare.platform.medical.dto.UpdateVaccinationRequest;
import com.petcare.platform.medical.repository.MedicalRecordRepository;
import com.petcare.platform.medical.repository.VaccinationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MedicalService {

    private final MedicalRecordRepository medicalRecordRepository;
    private final VaccinationRepository vaccinationRepository;
    private final MedicalAccessService accessService;

    // ─── Hồ sơ khám ────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<MedicalRecord> getRecordsByPet(UUID userId, UUID petId) {
        accessService.requireRead(userId, petId);
        return medicalRecordRepository.findByPetId(petId);
    }

    @Transactional(readOnly = true)
    public MedicalRecord getRecord(UUID userId, UUID id) {
        MedicalRecord record = findRecord(id);
        accessService.requireRead(userId, record.getPetId());
        return record;
    }

    @Transactional
    public MedicalRecord createRecord(UserPrincipal principal, CreateMedicalRecordRequest r) {
        accessService.requireWrite(principal.getId(), r.petId());
        requireContent(r.diagnosis(), r.treatment(), r.notes());
        return medicalRecordRepository.save(MedicalRecord.builder()
                .petId(r.petId())
                .visitDate(r.visitDate())
                .diagnosis(clean(r.diagnosis()))
                .treatment(clean(r.treatment()))
                .notes(clean(r.notes()))
                .vetName(principal.getFullName())
                .build());
    }

    @Transactional
    public MedicalRecord updateRecord(UUID userId, UUID id, UpdateMedicalRecordRequest r) {
        MedicalRecord record = findRecord(id);
        accessService.requireWrite(userId, record.getPetId());
        requireContent(r.diagnosis(), r.treatment(), r.notes());
        record.setVisitDate(r.visitDate());
        record.setDiagnosis(clean(r.diagnosis()));
        record.setTreatment(clean(r.treatment()));
        record.setNotes(clean(r.notes()));
        return medicalRecordRepository.save(record);
    }

    // ─── Sổ tiêm phòng ─────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Vaccination> getVaccinationsByPet(UUID userId, UUID petId) {
        accessService.requireRead(userId, petId);
        return vaccinationRepository.findByPetId(petId);
    }

    @Transactional
    public Vaccination createVaccination(UserPrincipal principal, CreateVaccinationRequest r) {
        accessService.requireWrite(principal.getId(), r.petId());
        requireDueAfter(r.administeredDate(), r.nextDueDate());
        return vaccinationRepository.save(Vaccination.builder()
                .petId(r.petId())
                .vaccineName(r.vaccineName().trim())
                .administeredDate(r.administeredDate())
                .nextDueDate(r.nextDueDate())
                .batchNumber(clean(r.batchNumber()))
                .vetName(principal.getFullName())
                .build());
    }

    @Transactional
    public Vaccination updateVaccination(UUID userId, UUID id, UpdateVaccinationRequest r) {
        Vaccination v = vaccinationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vaccination", id));
        accessService.requireWrite(userId, v.getPetId());
        requireDueAfter(r.administeredDate(), r.nextDueDate());
        v.setVaccineName(r.vaccineName().trim());
        v.setAdministeredDate(r.administeredDate());
        v.setNextDueDate(r.nextDueDate());
        v.setBatchNumber(clean(r.batchNumber()));
        return vaccinationRepository.save(v);
    }

    // Mũi tiêm sắp đến hạn của các thú cưng thuộc chủ nuôi, trong vòng `days` ngày tới
    @Transactional(readOnly = true)
    public List<Vaccination> dueVaccinations(UUID ownerId, int days) {
        LocalDate until = LocalDate.now().plusDays(Math.min(Math.max(days, 1), 365));

        // Với mỗi (thú cưng, loại vaccine) chỉ giữ mũi tiêm gần nhất
        Map<String, Vaccination> latest = new HashMap<>();
        for (Vaccination v : vaccinationRepository.findAllByOwner(ownerId)) {
            String key = v.getPetId() + "|" + v.getVaccineName().toLowerCase();
            Vaccination current = latest.get(key);
            if (current == null || v.getAdministeredDate().isAfter(current.getAdministeredDate())) {
                latest.put(key, v);
            }
        }
        return latest.values().stream()
                .filter(v -> v.getNextDueDate() != null && !v.getNextDueDate().isAfter(until))
                .sorted(Comparator.comparing(Vaccination::getNextDueDate))
                .toList();
    }

    // ─── Hàm phụ ───────────────────────────────────────────────────────────

    private MedicalRecord findRecord(UUID id) {
        return medicalRecordRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("MedicalRecord", id));
    }

    private void requireContent(String... parts) {
        for (String p : parts) {
            if (p != null && !p.isBlank()) {
                return;
            }
        }
        throw new BusinessException("Medical record must contain a diagnosis, treatment or notes");
    }

    private void requireDueAfter(LocalDate administered, LocalDate nextDue) {
        if (nextDue != null && !nextDue.isAfter(administered)) {
            throw new BusinessException("nextDueDate must be after administeredDate");
        }
    }

    private String clean(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}