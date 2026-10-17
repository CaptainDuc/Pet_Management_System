package com.petcare.platform.audit.controller;

import com.petcare.platform.audit.domain.AuditLog;
import com.petcare.platform.audit.service.AuditLogService;
import com.petcare.platform.common.dto.ApiResponse;
import com.petcare.platform.common.dto.PageResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/audit")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN') or hasRole('OWNER')")
@Tag(name = "Audit", description = "Read-only access log (ADMIN / OWNER)")
public class AuditLogController {

    private final AuditLogService auditLogService;

    /**
     * Previously this endpoint had no authorization and returned the entire table,
     * so any authenticated user could read every recorded change including
     * old_value/new_value payloads.
     */
    @GetMapping
    @Operation(summary = "Search the audit log (Admin / Owner)")
    public ApiResponse<PageResponse<AuditLog>> list(
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) UUID entityId,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) UUID userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateTo,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(PageResponse.from(
                auditLogService.search(entityType, entityId, action, userId, dateFrom, dateTo, page, size)));
    }
}