package com.petcare.platform.servicecatalog.repository;

import com.petcare.platform.servicecatalog.domain.ServiceCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ServiceCategoryRepository extends JpaRepository<ServiceCategory, UUID> {
}