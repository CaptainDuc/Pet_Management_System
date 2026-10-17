package com.petcare.platform.user.service;

import com.petcare.platform.common.dto.PageResponse;
import com.petcare.platform.common.exception.BusinessException;
import com.petcare.platform.common.exception.ResourceNotFoundException;
import com.petcare.platform.common.repository.SpecificationUtils;
import com.petcare.platform.rbac.domain.Role;
import com.petcare.platform.rbac.repository.RoleRepository;
import com.petcare.platform.user.domain.User;
import com.petcare.platform.user.dto.AssignRolesRequest;
import com.petcare.platform.user.dto.UpdateUserRequest;
import com.petcare.platform.user.dto.UserResponse;
import com.petcare.platform.user.dto.UserStatusUpdateRequest;
import com.petcare.platform.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    @Transactional(readOnly = true)
    public UserResponse getUserProfile(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        return UserResponse.from(user);
    }

    @Transactional
    public UserResponse updateUserProfile(UUID userId, UpdateUserRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        if (request.fullName() != null && !request.fullName().isBlank()) {
            user.setFullName(request.fullName());
        }
        if (request.phone() != null && !request.phone().isBlank()) {
            if (!request.phone().equals(user.getPhone()) && userRepository.existsByPhone(request.phone())) {
                throw new BusinessException("Phone number is already in use");
            }
            user.setPhone(request.phone());
        }
        if (request.avatarUrl() != null) {
            user.setAvatarUrl(request.avatarUrl());
        }

        User updated = userRepository.save(user);
        return UserResponse.from(updated);
    }

    @Transactional(readOnly = true)
    public PageResponse<UserResponse> getUsersList(String role, String status, String search, Pageable pageable) {
        // Specification instead of "(:p IS NULL OR col = :p)" predicates: an unbound
        // null has no inferable type on PostgreSQL, which made this endpoint fail with
        // "could not determine data type of parameter".
        Specification<User> spec = SpecificationUtils.allOf(
                SpecificationUtils.equalsIgnoreCase("role", role),
                SpecificationUtils.equalsIgnoreCase("status", status),
                SpecificationUtils.containsAny(List.of("fullName", "email"), search));

        Page<User> usersPage = userRepository.findAll(spec, pageable);
        return PageResponse.from(usersPage.map(UserResponse::from));
    }

    @Transactional(readOnly = true)
    public UserResponse getUserById(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));
        return UserResponse.from(user);
    }

    @Transactional
    public UserResponse updateUserStatus(UUID id, UserStatusUpdateRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));

        user.setStatus(request.status().toUpperCase());
        User updated = userRepository.save(user);
        return UserResponse.from(updated);
    }

    @Transactional
    public UserResponse assignRolesToUser(UUID userId, AssignRolesRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        Set<Role> roles = roleRepository.findByIdIn(request.roleIds());
        if (roles.isEmpty()) {
            throw new BusinessException("No valid roles found for provided IDs");
        }

        user.setRoles(roles);
        // Optionally sync primary role string if single role assigned
        roles.stream().findFirst().ifPresent(role -> user.setRole(role.getName()));

        User updated = userRepository.save(user);
        return UserResponse.from(updated);
    }
}
