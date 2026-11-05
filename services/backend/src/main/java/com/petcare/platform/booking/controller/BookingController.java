package com.petcare.platform.booking.controller;

import com.petcare.platform.booking.domain.BookingStatus;
import com.petcare.platform.booking.dto.BookingResponse;
import com.petcare.platform.booking.dto.CancelRequest;
import com.petcare.platform.booking.dto.CreateBookingRequest;
import com.petcare.platform.booking.service.BookingService;
import com.petcare.platform.common.dto.ApiResponse;
import com.petcare.platform.common.dto.PageResponse;
import com.petcare.platform.common.security.UserPrincipal;
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
@RequestMapping("/api/v1/bookings")
@RequiredArgsConstructor
@Tag(name = "Bookings", description = "Đặt lịch hẹn và các hành động đổi trạng thái")
public class BookingController {

    private final BookingService bookingService;

    @PostMapping
    @PreAuthorize("hasAuthority('booking:create')")
    public ResponseEntity<ApiResponse<BookingResponse>> create(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateBookingRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(bookingService.create(principal.getId(), request)));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('booking:read')")
    public ResponseEntity<ApiResponse<PageResponse<BookingResponse>>> list(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) BookingStatus status,
            @RequestParam(required = false) UUID petId,
            @RequestParam(required = false) UUID customerId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(
                Math.max(page, 0), Math.min(Math.max(size, 1), 50),
                Sort.by("createdAt").descending());
        return ResponseEntity.ok(ApiResponse.ok(PageResponse.from(
                bookingService.list(principal.getId(), status, petId, customerId, pageable))));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('booking:read')")
    public ResponseEntity<ApiResponse<BookingResponse>> get(
            @AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(bookingService.get(principal.getId(), id)));
    }

    @PostMapping("/{id}/confirm")
    @PreAuthorize("hasAuthority('booking:update')")
    public ResponseEntity<ApiResponse<BookingResponse>> confirm(
            @AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(bookingService.confirm(principal.getId(), id)));
    }

    @PostMapping("/{id}/start")
    @PreAuthorize("hasAuthority('booking:update')")
    public ResponseEntity<ApiResponse<BookingResponse>> start(
            @AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(bookingService.start(principal.getId(), id)));
    }

    @PostMapping("/{id}/complete")
    @PreAuthorize("hasAuthority('booking:update')")
    public ResponseEntity<ApiResponse<BookingResponse>> complete(
            @AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(bookingService.complete(principal.getId(), id)));
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('booking:cancel')")
    public ResponseEntity<ApiResponse<BookingResponse>> cancel(
            @AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id,
            @Valid @RequestBody CancelRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                bookingService.cancel(principal.getId(), id, request.reason())));
    }
}