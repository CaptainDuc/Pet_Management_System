package com.petcare.platform.servicecatalog.repository;

import com.petcare.platform.servicecatalog.domain.CareService;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;
import java.util.UUID;

public interface CareServiceRepository
        extends JpaRepository<CareService, UUID>, JpaSpecificationExecutor<CareService> {

    Optional<CareService> findByIdAndActiveTrue(UUID id);
}