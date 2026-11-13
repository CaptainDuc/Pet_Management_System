package com.petcare.platform.pet.controller;

import com.petcare.platform.common.dto.ApiResponse;
import com.petcare.platform.common.dto.PageResponse;
import com.petcare.platform.common.security.UserPrincipal;
import com.petcare.platform.pet.dto.CreatePetRequest;
import com.petcare.platform.pet.dto.PetResponse;
import com.petcare.platform.pet.service.PetService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/pets")
@RequiredArgsConstructor
@Tag(name = "Pets", description = "Hồ sơ thú cưng")
public class PetController {

    private final PetService petService;

    @PostMapping
    @PreAuthorize("hasAuthority('pet:write')")
    public ResponseEntity<ApiResponse<PetResponse>> create(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreatePetRequest request) {
        PetResponse response = petService.create(principal.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('pet:read')")
    public ResponseEntity<ApiResponse<PageResponse<PetResponse>>> list(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(
                Math.max(page, 0), Math.min(Math.max(size, 1), 50),
                Sort.by("createdAt").descending());
        return ResponseEntity.ok(ApiResponse.ok(
                PageResponse.from(petService.list(principal.getId(), search, pageable))));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('pet:read')")
    public ResponseEntity<ApiResponse<PetResponse>> get(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(petService.get(principal.getId(), id)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('pet:write')")
    public ResponseEntity<ApiResponse<PetResponse>> update(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @Valid @RequestBody CreatePetRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(petService.update(principal.getId(), id, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('pet:write')")
    public ResponseEntity<ApiResponse<Void>> delete(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id) {
        petService.delete(principal.getId(), id);
        return ResponseEntity.ok(ApiResponse.<Void>ok(null));
    }
}