package com.petcare.platform.staff.repository;

import com.petcare.platform.staff.domain.StaffSkill;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StaffSkillRepository extends JpaRepository<StaffSkill, UUID> {

    List<StaffSkill> findByStaffId(UUID staffId);

    Optional<StaffSkill> findByStaffIdAndServiceId(UUID staffId, UUID serviceId);
}