package com.petcare.platform.rbac.repository;

import com.petcare.platform.rbac.domain.Permission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Repository
public interface PermissionRepository extends JpaRepository<Permission, UUID> {

    Optional<Permission> findByCode(String code);

    boolean existsByCode(String code);

    Set<Permission> findByIdIn(Set<UUID> ids);

    List<Permission> findAllByOrderByModuleAscCodeAsc();
}
