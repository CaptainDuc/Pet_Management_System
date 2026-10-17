package com.petcare.platform.common.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.petcare.platform.common.dto.ApiResponse;
import com.petcare.platform.common.exception.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Counterpart of {@link RestAuthenticationEntryPoint}: authenticated but not
 * authorized requests also get the {@link ApiResponse} envelope instead of the
 * servlet container's default 403 body.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RestAccessDeniedHandler implements AccessDeniedHandler {

    private final ObjectMapper objectMapper;

    @Override
    public void handle(HttpServletRequest request,
                       HttpServletResponse response,
                       AccessDeniedException accessDeniedException) throws IOException {

        ErrorCode code = ErrorCode.ACCESS_DENIED;
        log.debug("403 for {} {}", request.getMethod(), request.getRequestURI());

        response.setStatus(code.getStatusValue());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(response.getOutputStream(),
                ApiResponse.error(code.getStatusValue(), code.getDefaultMessage()));
    }
}