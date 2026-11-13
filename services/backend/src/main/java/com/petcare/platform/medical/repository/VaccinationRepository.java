package com.petcare.platform.medical.repository;

import com.petcare.platform.medical.domain.Vaccination;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface VaccinationRepository extends JpaRepository<Vaccination, UUID> {

    List<Vaccination> findByPetId(UUID petId);

    // Toàn bộ sổ tiêm của các thú cưng còn hoạt động của một chủ nuôi
    @Query("""
            select v from Vaccination v, Pet p
            where v.petId = p.id and p.ownerId = :ownerId and p.active = true
            """)
    List<Vaccination> findAllByOwner(@Param("ownerId") UUID ownerId);
}