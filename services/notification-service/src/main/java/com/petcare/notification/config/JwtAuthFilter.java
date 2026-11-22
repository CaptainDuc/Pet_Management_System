package com.petcare.notification.config;

import com.petcare.notification.dto.ApiResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.crypto.SecretKey;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final SecretKey key;
    private final ObjectMapper objectMapper;
    private final RestClient core;

    public JwtAuthFilter(
            @Value("${JWT_SECRET:your-256-bit-secret-key-change-this-in-production-must-be-at-least-256-bits}")
            String secret,
            ObjectMapper objectMapper,
            @Value("${CORE_SERVICE_URL:http://localhost:8080}") String coreUrl) {
        this.objectMapper = objectMapper;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3000);
        factory.setReadTimeout(3000);
        core = RestClient.builder().baseUrl(coreUrl).requestFactory(factory).build();
        byte[] keyBytes;
        try {
            keyBytes = Decoders.BASE64.decode(secret);
        } catch (Exception ex) {
            keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        }
        if (keyBytes.length < 32) {
            byte[] padded = new byte[32];
            System.arraycopy(keyBytes, 0, padded, 0, keyBytes.length);
            keyBytes = padded;
        }
        this.key = Keys.hmacShaKeyFor(keyBytes);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return "OPTIONS".equalsIgnoreCase(request.getMethod())
                || !request.getRequestURI().startsWith("/api/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            reject(response, "Missing access token");
            return;
        }
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(key)
                    .clockSkewSeconds(30)
                    .build()
                    .parseSignedClaims(header.substring(7))
                    .getPayload();

            if (!"access".equalsIgnoreCase(claims.get("typ", String.class))) {
                reject(response, "Not an access token");
                return;
            }
            String userId = claims.get("userId", String.class);
            if (userId == null) {
                reject(response, "Token has no userId");
                return;
            }
            request.setAttribute("userId", UUID.fromString(userId));
        } catch (JwtException | IllegalArgumentException e) {
            reject(response, "Invalid or expired token");
            return;
        }
        // Core checks the current credential version, so a password reset also
        // invalidates an old JWT on this independently deployed service.
        try {
            core.get().uri("/api/v1/users/me").header("Authorization", header).retrieve().toBodilessEntity();
        } catch (RestClientResponseException ex) {
            reject(response, ex.getStatusCode().is4xxClientError() ? 401 : 503,
                    ex.getStatusCode().is4xxClientError() ? "Session no longer valid" : "Authentication service unavailable");
            return;
        } catch (RestClientException ex) {
            reject(response, 503, "Authentication service unavailable");
            return;
        }
        chain.doFilter(request, response);
    }

    private void reject(HttpServletResponse response, String message) throws IOException {
        reject(response, HttpServletResponse.SC_UNAUTHORIZED, message);
    }

    private void reject(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json;charset=UTF-8");
        ApiResponse<Void> apiResponse = ApiResponse.error(status, message);
        objectMapper.writeValue(response.getWriter(), apiResponse);
    }
}
