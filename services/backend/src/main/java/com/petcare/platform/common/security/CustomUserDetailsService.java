package com.petcare.platform.common.security;

import com.petcare.platform.user.domain.User;
import com.petcare.platform.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + username));

        Set<GrantedAuthority> authorities = new HashSet<>();

        // Add primary role authority
        if (user.getRole() != null && !user.getRole().isBlank()) {
            authorities.add(new SimpleGrantedAuthority("ROLE_" + user.getRole().toUpperCase()));
        }

        // Add RBAC roles and permissions if populated
        if (user.getRoles() != null) {
            user.getRoles().forEach(role -> {
                authorities.add(new SimpleGrantedAuthority("ROLE_" + role.getName().toUpperCase()));
                if (role.getPermissions() != null) {
                    role.getPermissions().forEach(permission ->
                            authorities.add(new SimpleGrantedAuthority(permission.getCode()))
                    );
                }
            });
        }

        return UserPrincipal.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .password(user.getPassword())
                .status(user.getStatus())
                .authorities(authorities)
                .build();
    }
}
