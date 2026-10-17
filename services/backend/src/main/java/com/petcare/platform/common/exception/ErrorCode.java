package com.petcare.platform.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Canonical error catalogue. Every response produced by
 * {@link GlobalExceptionHandler} or by the Spring Security entry points resolves
 * its HTTP status and default message from here, so status/message pairs stay
 * consistent across the whole API.
 */
public enum ErrorCode {

    // ─── 400 Bad Request ───────────────────────────────────────────────────
    VALIDATION_ERROR(HttpStatus.BAD_REQUEST, "Validation failed"),
    MALFORMED_REQUEST(HttpStatus.BAD_REQUEST, "Malformed request body"),
    INVALID_PARAMETER(HttpStatus.BAD_REQUEST, "Invalid parameter value"),
    MISSING_PARAMETER(HttpStatus.BAD_REQUEST, "Missing required parameter"),

    // ─── 401 Unauthorized ──────────────────────────────────────────────────
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "Authentication required"),
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "Invalid credentials"),

    // ─── 403 Forbidden ─────────────────────────────────────────────────────
    ACCESS_DENIED(HttpStatus.FORBIDDEN, "Access denied"),

    // ─── 404 Not Found ─────────────────────────────────────────────────────
    RESOURCE_NOT_FOUND(HttpStatus.NOT_FOUND, "Resource not found"),

    // ─── 405 / 413 / 415 ───────────────────────────────────────────────────
    METHOD_NOT_ALLOWED(HttpStatus.METHOD_NOT_ALLOWED, "Method not allowed"),
    PAYLOAD_TOO_LARGE(HttpStatus.PAYLOAD_TOO_LARGE, "Payload too large"),
    UNSUPPORTED_MEDIA_TYPE(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Unsupported media type"),

    // ─── 409 Conflict ──────────────────────────────────────────────────────
    CONFLICT(HttpStatus.CONFLICT, "Resource conflict"),
    DATA_INTEGRITY_VIOLATION(HttpStatus.CONFLICT, "Data integrity violation"),
    DUPLICATE_RESOURCE(HttpStatus.CONFLICT, "Resource already exists"),
    OPTIMISTIC_LOCK_CONFLICT(HttpStatus.CONFLICT, "Resource was modified concurrently"),

    // ─── 422 Unprocessable Entity ──────────────────────────────────────────
    BUSINESS_RULE_VIOLATION(HttpStatus.UNPROCESSABLE_ENTITY, "Business rule violation"),

    // ─── 5xx ───────────────────────────────────────────────────────────────
    UPSTREAM_UNAVAILABLE(HttpStatus.BAD_GATEWAY, "Upstream service unavailable"),
    UPSTREAM_TIMEOUT(HttpStatus.GATEWAY_TIMEOUT, "Upstream service timeout"),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error");

    private final HttpStatus httpStatus;
    private final String defaultMessage;

    ErrorCode(HttpStatus httpStatus, String defaultMessage) {
        this.httpStatus = httpStatus;
        this.defaultMessage = defaultMessage;
    }

    public HttpStatus getHttpStatus() {
        return httpStatus;
    }

    public String getDefaultMessage() {
        return defaultMessage;
    }

    public int getStatusValue() {
        return httpStatus.value();
    }
}