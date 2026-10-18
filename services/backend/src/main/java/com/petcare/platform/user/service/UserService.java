package com.petcare.platform.user.service;

import com.petcare.platform.common.dto.PageResponse;
import com.petcare.platform.common.exception.BusinessException;
import com.petcare.platform.auth.service.RefreshTokenRevocationService;
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

import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    /**
     * Highest privilege first. Only used to pick a deterministic primary role when the
     * previous one is no longer granted.
     */
    private static final Comparator<String> RBAC_ROLE_PRIORITY =
            Comparator.comparingInt(UserService::roleRank).thenComparing(Comparator.naturalOrder());

    // List.of preserves order; Set.of does not.
    private static final List<String> PRIMARY_ROLE_ORDER =
            List.of("ADMIN", "OWNER", "VETERINARIAN", "STAFF", "CUSTOMER");

    private static int roleRank(String role) {
        for (int index = 0; index < PRIMARY_ROLE_ORDER.size(); index++) {
            if (PRIMARY_ROLE_ORDER.get(index).equalsIgnoreCase(role)) {
                return index;
            }
        }
        return PRIMARY_ROLE_ORDER.size();
    }

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final RefreshTokenRevocationService revocationService;

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

    /**
     * Changes the account status.
     *
     * <p>Deactivating or locking also revokes every refresh token of that user.
     * Otherwise the tokens stay in the table and would start working again if the
     * account is later reactivated.
     */
    @Transactional
    public UserResponse updateUserStatus(UUID id, UserStatusUpdateRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));

        String status = request.status().trim().toUpperCase();
        user.setStatus(status);
        User updated = userRepository.save(user);

        if (!"ACTIVE".equals(status)) {
            revocationService.revokeAllForUser(updated.getId(), "Revoked because account status became " + status);
        }
        return UserResponse.from(updated);
    }

    /**
     * Replaces the user's role set and keeps {@code users.role} in sync.
     *
     * <p>{@code users.role} is the primary role that
     * {@code CustomUserDetailsService} turns into {@code ROLE_<name>}, so it must
     * name one of the assigned roles. It used to be taken from
     * {@code HashSet.findFirst()}, whose order is undefined, so the primary role
     * could silently change between requests.
     */
    @Transactional
    public UserResponse assignRolesToUser(UUID userId, AssignRolesRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        Set<Role> roles = roleRepository.findByIdIn(request.roleIds());
        if (roles.isEmpty()) {
            throw new BusinessException("No valid roles found for provided IDs");
        }

        // Keep the current primary role when it is still granted, otherwise fall back
        // to the highest-privilege role by a stable name ordering.
        String primaryRole = roles.stream()
                .map(Role::getName)
                .filter(current -> current.equalsIgnoreCase(user.getRole()))
                .findFirst()
                .orElseGet(() -> roles.stream()
                        .map(Role::getName)
                        .sorted(RBAC_ROLE_PRIORITY)
                        .findFirst()
                        .orElseThrow(() -> new BusinessException("No valid roles found for provided IDs")));

        user.setRoles(roles);
        user.setRole(primaryRole);

        return UserResponse.from(userRepository.save(user));
    }
}
