package com.petcare.platform.branch.controller;

import com.petcare.platform.branch.dto.BranchResponse;
import com.petcare.platform.branch.dto.CreateBranchRequest;
import com.petcare.platform.branch.dto.UpdateBranchRequest;
import com.petcare.platform.branch.service.BranchService;
import com.petcare.platform.common.dto.ApiResponse;
import com.petcare.platform.common.dto.PageResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/branches")
@RequiredArgsConstructor
@Tag(name = "Branches", description = "Quản lý chi nhánh (công khai GET, quản lý cần branch:write)")
public class BranchController {

    private final BranchService branchService;

    // ─── Công khai ──────────────────────────────────────────────────────────────

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<BranchResponse>>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(
                Math.max(page, 0), Math.min(Math.max(size, 1), 50),
                Sort.by("name").ascending());
        return ResponseEntity.ok(ApiResponse.ok(PageResponse.from(branchService.list(pageable))));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<BranchResponse>> get(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(branchService.get(id)));
    }

    // ─── Quản lý (cần branch:write) ─────────────────────────────────────────────

    @PostMapping
    @PreAuthorize("hasAuthority('branch:write')")
    public ResponseEntity<ApiResponse<BranchResponse>> create(
            @Valid @RequestBody CreateBranchRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(branchService.create(request)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('branch:write')")
    public ResponseEntity<ApiResponse<BranchResponse>> update(
            @PathVariable UUID id, @Valid @RequestBody UpdateBranchRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(branchService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('branch:write')")
    public ResponseEntity<ApiResponse<Void>> deactivate(@PathVariable UUID id) {
        branchService.deactivate(id);
        return ResponseEntity.ok(ApiResponse.<Void>ok(null));
    }
}