package com.petcare.platform.user.controller;

import com.petcare.platform.common.dto.ApiResponse;
import com.petcare.platform.common.dto.PageResponse;
import com.petcare.platform.common.security.UserPrincipal;
import com.petcare.platform.user.dto.AssignRolesRequest;
import com.petcare.platform.user.dto.UpdateUserRequest;
import com.petcare.platform.user.dto.UserResponse;
import com.petcare.platform.user.dto.UserStatusUpdateRequest;
import com.petcare.platform.user.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Tag(name = "User Management", description = "User profiles and admin user management")
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    @Operation(summary = "Get current authenticated user profile")
    public ResponseEntity<ApiResponse<UserResponse>> getMyProfile(@AuthenticationPrincipal UserPrincipal principal) {
        UserResponse response = userService.getUserProfile(principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PutMapping("/me")
    @Operation(summary = "Update current user profile (fullName, phone, avatarUrl)")
    public ResponseEntity<ApiResponse<UserResponse>> updateMyProfile(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody UpdateUserRequest request
    ) {
        UserResponse response = userService.updateUserProfile(principal.getId(), request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('OWNER')")
    @Operation(summary = "List all users with pagination and filtering (Admin / Owner)")
    public ResponseEntity<ApiResponse<PageResponse<UserResponse>>> getAllUsers(
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction
    ) {
        Sort sort = direction.equalsIgnoreCase("asc") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);
        PageResponse<UserResponse> response = userService.getUsersList(role, status, search, pageable);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('OWNER')")
    @Operation(summary = "Get user details by ID (Admin / Owner)")
    public ResponseEntity<ApiResponse<UserResponse>> getUserById(@PathVariable UUID id) {
        UserResponse response = userService.getUserById(id);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update user status (ACTIVE, INACTIVE, LOCKED) (Admin)")
    public ResponseEntity<ApiResponse<UserResponse>> updateUserStatus(
            @PathVariable UUID id,
            @Valid @RequestBody UserStatusUpdateRequest request
    ) {
        UserResponse response = userService.updateUserStatus(id, request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/{id}/roles")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Assign RBAC roles to user (Admin)")
    public ResponseEntity<ApiResponse<UserResponse>> assignRolesToUser(
            @PathVariable UUID id,
            @Valid @RequestBody AssignRolesRequest request
    ) {
        UserResponse response = userService.assignRolesToUser(id, request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}
