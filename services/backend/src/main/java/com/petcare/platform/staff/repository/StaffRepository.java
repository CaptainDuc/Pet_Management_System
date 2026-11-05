package com.petcare.platform.staff.repository;

import com.petcare.platform.staff.domain.Staff;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StaffRepository extends JpaRepository<Staff, UUID> {

    List<Staff> findByIdInAndActiveTrue(Collection<UUID> ids);
    
    boolean existsByUserId(UUID userId);

    Optional<Staff> findByIdAndActiveTrue(UUID id);
}