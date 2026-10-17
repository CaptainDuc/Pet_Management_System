package com.petcare.platform.common.exception;

import com.petcare.platform.common.dto.ApiResponse;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.BindException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Single place where exceptions become HTTP responses. Every handler returns the
 * {@link ApiResponse} envelope (status / success / message / data / timestamp) and
 * always resolves its status from {@link ErrorCode}.
 *
 * <p>Spring picks the most specific matching handler, so ordering does not matter:
 * {@code BadCredentialsException} wins over {@code AuthenticationException} and
 * {@code DuplicateKeyException} wins over {@code DataIntegrityViolationException}.
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Pattern CONSTRAINT_PATTERN = Pattern.compile("constraint \"([^\"]+)\"");

    // ─── 404 ───────────────────────────────────────────────────────────────

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNotFound(ResourceNotFoundException ex) {
        log.warn("Resource not found: {}", ex.getMessage());
        return build(ErrorCode.RESOURCE_NOT_FOUND, ex.getMessage());
    }

    /** No controller mapped the path, e.g. an unknown {@code /api/v1/...} segment. */
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNoResourceFound(NoResourceFoundException ex) {
        log.warn("No handler for path {}", ex.getResourcePath());
        return build(ErrorCode.RESOURCE_NOT_FOUND, "No endpoint for " + ex.getResourcePath());
    }

    // ─── 400 Bad Request ───────────────────────────────────────────────────

    /** {@code @Valid @RequestBody} failures. Payload is a field -> message map. */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Map<String, String>>> handleValidation(
            MethodArgumentNotValidException ex) {
        Map<String, String> errors = new LinkedHashMap<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            merge(errors, error.getField(), error.getDefaultMessage());
        }
        ex.getBindingResult().getGlobalErrors()
                .forEach(error -> merge(errors, error.getObjectName(), error.getDefaultMessage()));

        if (errors.isEmpty()) {
            errors.put("request", ErrorCode.VALIDATION_ERROR.getDefaultMessage());
        }
        log.debug("Validation failed: {}", errors);
        return build(ErrorCode.VALIDATION_ERROR, ErrorCode.VALIDATION_ERROR.getDefaultMessage(), errors);
    }

    /** {@code @Valid @ModelAttribute} / form binding failures. */
    @ExceptionHandler(BindException.class)
    public ResponseEntity<ApiResponse<Map<String, String>>> handleBind(BindException ex) {
        Map<String, String> errors = new LinkedHashMap<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            merge(errors, error.getField(), error.getDefaultMessage());
        }
        log.debug("Binding failed: {}", errors);
        return build(ErrorCode.VALIDATION_ERROR, ErrorCode.VALIDATION_ERROR.getDefaultMessage(), errors);
    }

    /** {@code @Validated} failures on {@code @RequestParam} / {@code @PathVariable}. */
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiResponse<Map<String, String>>> handleConstraintViolation(
            ConstraintViolationException ex) {
        Map<String, String> errors = new LinkedHashMap<>();
        if (ex.getConstraintViolations() != null) {
            for (ConstraintViolation<?> violation : ex.getConstraintViolations()) {
                merge(errors, leafProperty(violation.getPropertyPath().toString()), violation.getMessage());
            }
        }
        log.debug("Constraint violation: {}", errors);
        return build(ErrorCode.VALIDATION_ERROR, ErrorCode.VALIDATION_ERROR.getDefaultMessage(), errors);
    }

    /** Path variable / query parameter has the wrong type, e.g. {@code /users/not-a-uuid}. */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiResponse<Void>> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        log.debug("Type mismatch on '{}': {}", ex.getName(), ex.getValue());
        return build(ErrorCode.INVALID_PARAMETER, "Parameter '" + ex.getName() + "' has an invalid value");
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ApiResponse<Void>> handleMissingParameter(MissingServletRequestParameterException ex) {
        log.debug("Missing parameter: {}", ex.getParameterName());
        return build(ErrorCode.MISSING_PARAMETER, "Missing required parameter '" + ex.getParameterName() + "'");
    }

    /** Malformed JSON, unreadable body, or a type mismatch inside the payload. */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Void>> handleUnreadableBody(HttpMessageNotReadableException ex) {
        log.debug("Unreadable request body", ex);
        return build(ErrorCode.MALFORMED_REQUEST, ErrorCode.MALFORMED_REQUEST.getDefaultMessage());
    }

    // ─── 405 / 413 / 415 ───────────────────────────────────────────────────

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiResponse<Void>> handleMethodNotSupported(HttpRequestMethodNotSupportedException ex) {
        log.debug("Method not supported: {}", ex.getMethod());
        return build(ErrorCode.METHOD_NOT_ALLOWED, ErrorCode.METHOD_NOT_ALLOWED.getDefaultMessage());
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ApiResponse<Void>> handleUnsupportedMediaType(HttpMediaTypeNotSupportedException ex) {
        log.debug("Unsupported media type: {}", ex.getContentType());
        return build(ErrorCode.UNSUPPORTED_MEDIA_TYPE, ErrorCode.UNSUPPORTED_MEDIA_TYPE.getDefaultMessage());
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiResponse<Void>> handleMaxUploadSize(MaxUploadSizeExceededException ex) {
        log.debug("Upload exceeds configured limit: {}", ex.getMaxUploadSize());
        return build(ErrorCode.PAYLOAD_TOO_LARGE, ErrorCode.PAYLOAD_TOO_LARGE.getDefaultMessage());
    }

    // ─── 409 Conflict ──────────────────────────────────────────────────────

    /** Unique / CHECK / FK constraint violation. Logs the driver detail, returns a safe message. */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleDataIntegrity(DataIntegrityViolationException ex) {
        log.warn("Data integrity violation (constraint={})", extractConstraintName(ex), ex);
        return build(ErrorCode.DATA_INTEGRITY_VIOLATION, ErrorCode.DATA_INTEGRITY_VIOLATION.getDefaultMessage());
    }

    @ExceptionHandler(DuplicateKeyException.class)
    public ResponseEntity<ApiResponse<Void>> handleDuplicateKey(DuplicateKeyException ex) {
        log.warn("Duplicate key (constraint={})", extractConstraintName(ex), ex);
        return build(ErrorCode.DUPLICATE_RESOURCE, ErrorCode.DUPLICATE_RESOURCE.getDefaultMessage());
    }

    /** Lost an optimistic-lock race on a {@code @Version} column. */
    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    public ResponseEntity<ApiResponse<Void>> handleOptimisticLock(ObjectOptimisticLockingFailureException ex) {
        log.warn("Optimistic lock conflict", ex);
        return build(ErrorCode.OPTIMISTIC_LOCK_CONFLICT, ErrorCode.OPTIMISTIC_LOCK_CONFLICT.getDefaultMessage());
    }

    // ─── 401 / 403 ─────────────────────────────────────────────────────────

    /** Deliberately does not reveal whether the email exists. */
    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiResponse<Void>> handleBadCredentials(BadCredentialsException ex) {
        return build(ErrorCode.INVALID_CREDENTIALS, ErrorCode.INVALID_CREDENTIALS.getDefaultMessage());
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiResponse<Void>> handleAuthentication(AuthenticationException ex) {
        log.debug("Authentication failure: {}", ex.getMessage());
        return build(ErrorCode.UNAUTHORIZED, ErrorCode.UNAUTHORIZED.getDefaultMessage());
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDenied(AccessDeniedException ex) {
        log.warn("Access denied: {}", ex.getMessage());
        return build(ErrorCode.ACCESS_DENIED, ErrorCode.ACCESS_DENIED.getDefaultMessage());
    }

    // ─── 422 ───────────────────────────────────────────────────────────────

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<Void>> handleBusiness(BusinessException ex) {
        log.warn("Business exception: {}", ex.getMessage());
        return build(ErrorCode.BUSINESS_RULE_VIOLATION, ex.getMessage());
    }

    // ─── Catch-all ─────────────────────────────────────────────────────────

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGeneric(Exception ex) {
        log.error("Unexpected error", ex);
        return build(ErrorCode.INTERNAL_ERROR, ErrorCode.INTERNAL_ERROR.getDefaultMessage());
    }

    // ─── Helpers ───────────────────────────────────────────────────────────

    private static void merge(Map<String, String> errors, String field, String message) {
        errors.merge(field == null ? "request" : field,
                message == null ? "is invalid" : message,
                (existing, added) -> existing + "; " + added);
    }

    private static String leafProperty(String path) {
        int lastDot = path.lastIndexOf('.');
        return lastDot >= 0 ? path.substring(lastDot + 1) : path;
    }

    private static String extractConstraintName(Throwable ex) {
        Throwable cause = ex.getCause();
        String message = cause != null ? cause.getMessage() : ex.getMessage();
        if (message == null) {
            return null;
        }
        Matcher matcher = CONSTRAINT_PATTERN.matcher(message);
        return matcher.find() ? matcher.group(1) : null;
    }

    private static ResponseEntity<ApiResponse<Void>> build(ErrorCode code, String message) {
        return build(code, message, null);
    }

    private static <T> ResponseEntity<ApiResponse<T>> build(ErrorCode code, String message, T data) {
        return ResponseEntity.status(code.getHttpStatus())
                .body(ApiResponse.error(code.getStatusValue(), message, data));
    }
}