package com.petcare.platform.rbac.service;

import com.petcare.platform.common.exception.BusinessException;
import com.petcare.platform.common.exception.ResourceNotFoundException;
import com.petcare.platform.rbac.domain.Permission;
import com.petcare.platform.rbac.domain.Role;
import com.petcare.platform.rbac.dto.*;
import com.petcare.platform.rbac.repository.PermissionRepository;
import com.petcare.platform.rbac.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RbacService {

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;

    @Transactional(readOnly = true)
    public List<RoleResponse> getAllRoles() {
        return roleRepository.findAll().stream()
                .map(RoleResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public RoleResponse createRole(CreateRoleRequest request) {
        String name = request.name().toUpperCase();
        if (roleRepository.existsByName(name)) {
            throw new BusinessException("Role with name '" + name + "' already exists");
        }

        Role role = Role.builder()
                .name(name)
                .description(request.description())
                .build();

        Role saved = roleRepository.save(role);
        return RoleResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public RoleResponse getRoleById(UUID id) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Role", id));
        return RoleResponse.from(role);
    }

    @Transactional
    public RoleResponse updateRole(UUID id, CreateRoleRequest request) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Role", id));

        if (!role.getName().equalsIgnoreCase(request.name()) && roleRepository.existsByName(request.name().toUpperCase())) {
            throw new BusinessException("Role with name '" + request.name() + "' already exists");
        }

        role.setName(request.name().toUpperCase());
        role.setDescription(request.description());

        Role saved = roleRepository.save(role);
        return RoleResponse.from(saved);
    }

    @Transactional
    public void deleteRole(UUID id) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Role", id));
        roleRepository.delete(role);
    }

    @Transactional(readOnly = true)
    public List<PermissionResponse> getAllPermissions() {
        return permissionRepository.findAll().stream()
                .map(PermissionResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public PermissionResponse createPermission(CreatePermissionRequest request) {
        if (permissionRepository.existsByCode(request.code())) {
            throw new BusinessException("Permission with code '" + request.code() + "' already exists");
        }

        Permission permission = Permission.builder()
                .code(request.code())
                .name(request.name())
                .module(request.module())
                .description(request.description())
                .build();

        Permission saved = permissionRepository.save(permission);
        return PermissionResponse.from(saved);
    }

    @Transactional
    public RoleResponse assignPermissionsToRole(UUID roleId, AssignPermissionsRequest request) {
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new ResourceNotFoundException("Role", roleId));

        Set<Permission> permissions = permissionRepository.findByIdIn(request.permissionIds());
        role.setPermissions(permissions);

        Role updated = roleRepository.save(role);
        return RoleResponse.from(updated);
    }

    @Transactional
    public RoleResponse removePermissionFromRole(UUID roleId, UUID permissionId) {
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new ResourceNotFoundException("Role", roleId));

        role.getPermissions().removeIf(p -> p.getId().equals(permissionId));
        Role updated = roleRepository.save(role);
        return RoleResponse.from(updated);
    }
}
