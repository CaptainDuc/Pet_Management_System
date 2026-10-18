package com.petcare.platform.rbac.controller;

import com.petcare.platform.common.dto.ApiResponse;
import com.petcare.platform.rbac.dto.*;
import com.petcare.platform.rbac.service.RbacService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/rbac")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "RBAC Management", description = "Endpoints for managing roles and permissions (Admin)")
public class RbacController {

    private final RbacService rbacService;

    // ─── Roles ───────────────────────────────────────────────────────────────
    @GetMapping("/roles")
    @Operation(summary = "List all RBAC roles")
    public ResponseEntity<ApiResponse<List<RoleResponse>>> getAllRoles() {
        return ResponseEntity.ok(ApiResponse.ok(rbacService.getAllRoles()));
    }

    @PostMapping("/roles")
    @Operation(summary = "Create a new role")
    public ResponseEntity<ApiResponse<RoleResponse>> createRole(@Valid @RequestBody CreateRoleRequest request) {
        RoleResponse response = rbacService.createRole(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }

    @GetMapping("/roles/{id}")
    @Operation(summary = "Get role details by ID")
    public ResponseEntity<ApiResponse<RoleResponse>> getRoleById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(rbacService.getRoleById(id)));
    }

    @PutMapping("/roles/{id}")
    @Operation(summary = "Update role details")
    public ResponseEntity<ApiResponse<RoleResponse>> updateRole(
            @PathVariable UUID id,
            @Valid @RequestBody CreateRoleRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(rbacService.updateRole(id, request)));
    }

    @DeleteMapping("/roles/{id}")
    @Operation(summary = "Delete role by ID")
    public ResponseEntity<ApiResponse<Void>> deleteRole(@PathVariable UUID id) {
        rbacService.deleteRole(id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    // ─── Permissions ─────────────────────────────────────────────────────────
    @GetMapping("/permissions")
    @Operation(summary = "List all RBAC permissions")
    public ResponseEntity<ApiResponse<List<PermissionResponse>>> getAllPermissions() {
        return ResponseEntity.ok(ApiResponse.ok(rbacService.getAllPermissions()));
    }

    @GetMapping("/permissions/{id}")
    @Operation(summary = "Get a permission by ID")
    public ResponseEntity<ApiResponse<PermissionResponse>> getPermissionById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(rbacService.getPermissionById(id)));
    }

    @PostMapping("/permissions")
    @Operation(summary = "Create a new permission")
    public ResponseEntity<ApiResponse<PermissionResponse>> createPermission(@Valid @RequestBody CreatePermissionRequest request) {
        PermissionResponse response = rbacService.createPermission(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }

    // ─── Role-Permission Assignments ──────────────────────────────────────────
    @PostMapping("/roles/{roleId}/permissions")
    @Operation(summary = "Assign a set of permissions to a role")
    public ResponseEntity<ApiResponse<RoleResponse>> assignPermissionsToRole(
            @PathVariable UUID roleId,
            @Valid @RequestBody AssignPermissionsRequest request
    ) {
        RoleResponse response = rbacService.assignPermissionsToRole(roleId, request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @DeleteMapping("/roles/{roleId}/permissions/{permissionId}")
    @Operation(summary = "Remove a permission from a role")
    public ResponseEntity<ApiResponse<RoleResponse>> removePermissionFromRole(
            @PathVariable UUID roleId,
            @PathVariable UUID permissionId
    ) {
        RoleResponse response = rbacService.removePermissionFromRole(roleId, permissionId);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}
