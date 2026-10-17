package com.petcare.platform.medical.repository;

import com.petcare.platform.medical.domain.MedicalRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface MedicalRecordRepository extends JpaRepository<MedicalRecord, UUID> {
    List<MedicalRecord> findByPetId(UUID petId);
}
