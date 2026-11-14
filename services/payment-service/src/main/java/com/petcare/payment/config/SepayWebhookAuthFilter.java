package com.petcare.payment.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * Verifies the {@code Authorization: Apikey <SEPAY_API_KEY>} header on SePay
 * callbacks. The key is only read from configuration, never hardcoded.
 */
@Component
@RequiredArgsConstructor
public class SepayWebhookAuthFilter extends OncePerRequestFilter {

    private static final String WEBHOOK_PATH = "/api/v1/webhooks/sepay";

    private final SepayProperties properties;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !WEBHOOK_PATH.equals(request.getRequestURI());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        String expected = "Apikey " + properties.apiKey();

        if (header == null || !MessageDigest.isEqual(
                header.getBytes(StandardCharsets.UTF_8),
                expected.getBytes(StandardCharsets.UTF_8))) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding(StandardCharsets.UTF_8.name());
            response.getWriter().write("{\"success\":false,\"message\":\"Unauthorized\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }
}
