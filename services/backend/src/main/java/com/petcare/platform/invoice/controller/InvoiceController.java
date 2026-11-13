package com.petcare.platform.invoice.controller;

import com.petcare.platform.common.dto.ApiResponse;
import com.petcare.platform.common.dto.PageResponse;
import com.petcare.platform.common.security.UserPrincipal;
import com.petcare.platform.invoice.dto.InvoiceResponse;
import com.petcare.platform.invoice.dto.IssueInvoiceRequest;
import com.petcare.platform.invoice.service.InvoiceService;
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
@RequestMapping("/api/v1/invoices")
@RequiredArgsConstructor
@Tag(name = "Invoices", description = "Hóa đơn của lịch hẹn đã hoàn thành")
public class InvoiceController {

    private final InvoiceService invoiceService;

    @PostMapping
    @PreAuthorize("hasAuthority('invoice:write')")
    public ResponseEntity<ApiResponse<InvoiceResponse>> issue(@Valid @RequestBody IssueInvoiceRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(invoiceService.issue(request.bookingId())));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('invoice:read')")
    public ResponseEntity<ApiResponse<PageResponse<InvoiceResponse>>> list(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 50),
                Sort.by("createdAt").descending());
        return ResponseEntity.ok(ApiResponse.ok(
                PageResponse.from(invoiceService.list(principal.getId(), pageable))));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('invoice:read')")
    public ResponseEntity<ApiResponse<InvoiceResponse>> get(
            @AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(invoiceService.get(principal.getId(), id)));
    }

    @GetMapping("/by-booking/{bookingId}")
    @PreAuthorize("hasAuthority('invoice:read')")
    public ResponseEntity<ApiResponse<InvoiceResponse>> getByBooking(
            @AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID bookingId) {
        return ResponseEntity.ok(ApiResponse.ok(invoiceService.getByBooking(principal.getId(), bookingId)));
    }
}