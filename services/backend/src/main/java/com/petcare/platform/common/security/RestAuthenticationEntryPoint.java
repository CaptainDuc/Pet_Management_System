package com.petcare.platform.common.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.petcare.platform.common.dto.ApiResponse;
import com.petcare.platform.common.exception.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Replaces Spring Security's default HTML/empty 401 body so that unauthenticated
 * calls return the same {@link ApiResponse} envelope as every other error.
 * Invoked by {@code ExceptionTranslationFilter} when an anonymous request hits a
 * protected endpoint.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RestAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;

    @Override
    public void commence(HttpServletRequest request,
                         HttpServletResponse response,
                         AuthenticationException authException) throws IOException {

        ErrorCode code = ErrorCode.UNAUTHORIZED;
        log.debug("401 for {} {}: {}", request.getMethod(), request.getRequestURI(), authException.getMessage());

        response.setStatus(code.getStatusValue());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(response.getOutputStream(),
                ApiResponse.error(code.getStatusValue(), code.getDefaultMessage()));
    }
}