package com.petcare.platform.common.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Reads {@code Authorization: Bearer <jwt>} and populates the security context.
 *
 * <p>Only {@code typ=access} tokens are accepted; refresh tokens are ignored so they
 * can never be used as a bearer credential.
 *
 * <p>When a token is present but unusable the request is left anonymous instead of
 * failing fast. For protected endpoints {@code ExceptionTranslationFilter} then
 * produces a 401 through {@link RestAuthenticationEntryPoint}; public endpoints stay
 * reachable, which keeps {@code /api/v1/auth/login} working even if a client sends a
 * stale token by mistake.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {

        String jwt = resolveToken(request);

        if (jwt != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            authenticate(jwt, request);
        }

        filterChain.doFilter(request, response);
    }

    private String resolveToken(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith(BEARER_PREFIX)) {
            return null;
        }
        String token = authHeader.substring(BEARER_PREFIX.length()).trim();
        return token.isEmpty() ? null : token;
    }

    private void authenticate(String jwt, HttpServletRequest request) {
        try {
            if (!jwtService.isAccessToken(jwt)) {
                log.debug("Ignoring non-access token on {} {}", request.getMethod(), request.getRequestURI());
                return;
            }

            String email = jwtService.extractUsername(jwt);
            if (email == null) {
                return;
            }

            // Authorities are loaded from the database on every request, so RBAC changes
            // take effect immediately instead of waiting for the access token to expire.
            UserDetails userDetails = userDetailsService.loadUserByUsername(email);

            if (!jwtService.isTokenValid(jwt, userDetails)) {
                return;
            }
            // A signature-valid token does not imply the account is still usable.
            if (!userDetails.isEnabled() || !userDetails.isAccountNonLocked()) {
                log.debug("Token accepted but account is not usable (status={})", userDetails);
                return;
            }

            UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                    userDetails, null, userDetails.getAuthorities());
            authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(authToken);

        } catch (UsernameNotFoundException ex) {
            log.debug("Token subject no longer exists: {}", ex.getMessage());
        } catch (Exception ex) {
            log.debug("JWT authentication failed: {}", ex.getMessage());
        }
    }
}