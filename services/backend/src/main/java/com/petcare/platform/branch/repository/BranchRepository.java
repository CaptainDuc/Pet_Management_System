package com.petcare.platform.branch.repository;

import com.petcare.platform.branch.domain.Branch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;
import java.util.UUID;

public interface BranchRepository
        extends JpaRepository<Branch, UUID>, JpaSpecificationExecutor<Branch> {

    Optional<Branch> findByIdAndActiveTrue(UUID id);
}