package com.petcare.platform.servicecatalog.controller;

import com.petcare.platform.common.dto.ApiResponse;
import com.petcare.platform.common.dto.PageResponse;
import com.petcare.platform.servicecatalog.dto.CategoryResponse;
import com.petcare.platform.servicecatalog.dto.CreateCategoryRequest;
import com.petcare.platform.servicecatalog.dto.CreateServiceRequest;
import com.petcare.platform.servicecatalog.dto.ServiceResponse;
import com.petcare.platform.servicecatalog.service.CatalogService;
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

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/services")
@RequiredArgsConstructor
@Tag(name = "Service Catalog", description = "Danh mục dịch vụ (xem công khai, quản lý cần quyền service:write)")
public class ServiceCatalogController {

    private final CatalogService catalogService;

    // ─── Công khai (SecurityConfig cho phép GET /api/v1/services/**) ────────

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ServiceResponse>>> list(
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(
                Math.max(page, 0), Math.min(Math.max(size, 1), 50), Sort.by("name").ascending());
        return ResponseEntity.ok(ApiResponse.ok(
                PageResponse.from(catalogService.listServices(categoryId, search, pageable))));
    }

    @GetMapping("/categories")
    public ResponseEntity<ApiResponse<List<CategoryResponse>>> categories() {
        return ResponseEntity.ok(ApiResponse.ok(catalogService.listCategories()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ServiceResponse>> get(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(catalogService.getService(id)));
    }

    // ─── Quản lý (cần service:write) ────────────────────────────────────────

    @PostMapping
    @PreAuthorize("hasAuthority('service:write')")
    public ResponseEntity<ApiResponse<ServiceResponse>> create(
            @Valid @RequestBody CreateServiceRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(catalogService.createService(request)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('service:write')")
    public ResponseEntity<ApiResponse<ServiceResponse>> update(
            @PathVariable UUID id, @Valid @RequestBody CreateServiceRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(catalogService.updateService(id, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('service:write')")
    public ResponseEntity<ApiResponse<Void>> deactivate(@PathVariable UUID id) {
        catalogService.deactivateService(id);
        return ResponseEntity.ok(ApiResponse.<Void>ok(null));
    }

    @PostMapping("/categories")
    @PreAuthorize("hasAuthority('service:write')")
    public ResponseEntity<ApiResponse<CategoryResponse>> createCategory(
            @Valid @RequestBody CreateCategoryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(catalogService.createCategory(request)));
    }
}