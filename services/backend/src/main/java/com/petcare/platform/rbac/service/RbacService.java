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
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RbacService {

    /**
     * Roles that back {@code @PreAuthorize("hasRole('...')")} and the HTTP-level
     * rules in SecurityConfig. They are seeded by V4 and must not be deleted or
     * renamed, otherwise authorization starts failing in production.
     */
    private static final Set<String> PROTECTED_ROLES = Set.of("ADMIN", "OWNER", "STAFF", "VETERINARIAN", "CUSTOMER");

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;

    // ─── Roles ──────────────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<RoleResponse> getAllRoles() {
        return roleRepository.findAllByOrderByNameAsc().stream()
                .map(RoleResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public RoleResponse createRole(CreateRoleRequest request) {
        String name = normalise(request.name());
        if (roleRepository.existsByName(name)) {
            throw new BusinessException("Role with name '" + name + "' already exists");
        }

        Role role = Role.builder()
                .name(name)
                .description(request.description())
                .build();

        return RoleResponse.from(roleRepository.save(role));
    }

    @Transactional(readOnly = true)
    public RoleResponse getRoleById(UUID id) {
        return RoleResponse.from(requireRole(id));
    }

    @Transactional
    public RoleResponse updateRole(UUID id, CreateRoleRequest request) {
        Role role = requireRole(id);
        String name = normalise(request.name());

        if (!role.getName().equalsIgnoreCase(name) && roleRepository.existsByName(name)) {
            throw new BusinessException("Role with name '" + name + "' already exists");
        }
        if (PROTECTED_ROLES.contains(role.getName()) && !role.getName().equals(name)) {
            throw new BusinessException("Role '" + role.getName() + "' is a system role and cannot be renamed");
        }

        role.setName(name);
        role.setDescription(request.description());
        return RoleResponse.from(roleRepository.save(role));
    }

    @Transactional
    public void deleteRole(UUID id) {
        Role role = requireRole(id);

        if (PROTECTED_ROLES.contains(role.getName())) {
            throw new BusinessException("Role '" + role.getName() + "' is a system role and cannot be deleted");
        }
        long holders = roleRepository.countUsersWithRole(id);
        if (holders > 0) {
            throw new BusinessException("Role '" + role.getName() + "' is still assigned to "
                    + holders + " user(s)");
        }

        roleRepository.delete(role);
    }

    // ─── Permissions ────────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<PermissionResponse> getAllPermissions() {
        return permissionRepository.findAllByOrderByModuleAscCodeAsc().stream()
                .map(PermissionResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PermissionResponse getPermissionById(UUID id) {
        return PermissionResponse.from(requirePermission(id));
    }

    @Transactional
    public PermissionResponse createPermission(CreatePermissionRequest request) {
        String code = normalise(request.code());
        if (permissionRepository.existsByCode(code)) {
            throw new BusinessException("Permission with code '" + code + "' already exists");
        }

        Permission permission = Permission.builder()
                .code(code)
                .name(request.name())
                .module(request.module())
                .description(request.description())
                .build();

        return PermissionResponse.from(permissionRepository.save(permission));
    }

    // ─── Role ↔ permission assignments ───────────────────────────────────────────────────

    /**
     * Replaces the role's permission set.
     *
     * <p>Semantics are "set exactly these", not "add these"; use
     * {@code DELETE /roles/{roleId}/permissions/{permissionId}} to remove one.
     */
    @Transactional
    public RoleResponse assignPermissionsToRole(UUID roleId, AssignPermissionsRequest request) {
        Role role = requireRole(roleId);

        Set<Permission> requested = permissionRepository.findByIdIn(request.permissionIds());
        if (requested.size() != request.permissionIds().size()) {
            Set<UUID> found = requested.stream().map(Permission::getId).collect(Collectors.toSet());
            request.permissionIds().stream()
                    .filter(id -> !found.contains(id))
                    .findFirst()
                    .ifPresent(id -> {
                        throw new ResourceNotFoundException("Permission", id);
                    });
        }

        role.setPermissions(requested);
        return RoleResponse.from(roleRepository.save(role));
    }

    @Transactional
    public RoleResponse removePermissionFromRole(UUID roleId, UUID permissionId) {
        Role role = requireRole(roleId);
        requirePermission(permissionId);

        role.getPermissions().removeIf(permission -> Objects.equals(permission.getId(), permissionId));
        return RoleResponse.from(roleRepository.save(role));
    }

    // ─── Helpers ────────────────────────────────────────────────────────────────────────

    private Role requireRole(UUID id) {
        return roleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Role", id));
    }

    private Permission requirePermission(UUID id) {
        return permissionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Permission", id));
    }

    private static String normalise(String value) {
        return value.trim().toUpperCase();
    }
}