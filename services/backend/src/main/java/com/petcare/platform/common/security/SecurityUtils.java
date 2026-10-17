package com.petcare.platform.common.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;
import java.util.UUID;

/**
 * Helpers for reading the authenticated principal without repeating
 * {@code @AuthenticationPrincipal} plumbing in every controller.
 *
 * <p>Every accessor is null-safe: unauthenticated calls return {@link Optional#empty()}
 * (or throw from the {@code require*} variants) instead of NPE.
 */
public final class SecurityUtils {

    private SecurityUtils() {
    }

    public static Optional<Authentication> getAuthentication() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return Optional.empty();
        }
        // AnonymousAuthenticationToken is authenticated=true but represents nobody.
        String authority = authentication.getAuthorities().stream()
                .map(a -> a.getAuthority())
                .findFirst()
                .orElse(null);
        if (authority == null || "ROLE_ANONYMOUS".equals(authority)) {
            return Optional.empty();
        }
        return Optional.of(authentication);
    }

    public static Optional<UserPrincipal> getPrincipal() {
        return getAuthentication()
                .map(Authentication::getPrincipal)
                .filter(UserPrincipal.class::isInstance)
                .map(UserPrincipal.class::cast);
    }

    public static Optional<UUID> getCurrentUserId() {
        return getPrincipal().map(UserPrincipal::getId);
    }

    /** @throws org.springframework.security.access.AccessDeniedException if unauthenticated */
    public static UUID requireCurrentUserId() {
        return getCurrentUserId().orElseThrow(() -> new org.springframework.security.access.AccessDeniedException(
                "No authenticated user in security context"));
    }

    public static Optional<String> getCurrentUserEmail() {
        return getPrincipal().map(UserPrincipal::getEmail);
    }

    public static boolean hasRole(String role) {
        String expected = role.startsWith("ROLE_") ? role : "ROLE_" + role.toUpperCase();
        return getAuthentication()
                .map(auth -> auth.getAuthorities().stream()
                        .anyMatch(a -> expected.equalsIgnoreCase(a.getAuthority())))
                .orElse(false);
    }

    public static boolean hasAnyRole(String... roles) {
        for (String role : roles) {
            if (hasRole(role)) {
                return true;
            }
        }
        return false;
    }

    /** RBAC permission code, e.g. {@code medical:create}. */
    public static boolean hasPermission(String permissionCode) {
        return getAuthentication()
                .map(auth -> auth.getAuthorities().stream()
                        .anyMatch(a -> permissionCode.equals(a.getAuthority())))
                .orElse(false);
    }

    public static boolean isAuthenticated() {
        return getAuthentication().isPresent();
    }
}