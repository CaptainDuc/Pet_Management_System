package com.petcare.platform.medical.repository;

import com.petcare.platform.medical.domain.Vaccination;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface VaccinationRepository extends JpaRepository<Vaccination, UUID> {
    List<Vaccination> findByPetId(UUID petId);
}
