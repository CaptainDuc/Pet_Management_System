package com.petcare.platform.booking.controller;

import com.petcare.platform.booking.dto.BookingResponse;
import com.petcare.platform.booking.dto.CreateBookingRequest;
import com.petcare.platform.booking.service.BookingService;
import com.petcare.platform.booking.service.VisitQueue;
import com.petcare.platform.common.dto.ApiResponse;
import com.petcare.platform.common.security.UserPrincipal;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/bookings/queue")
@RequiredArgsConstructor
public class VisitQueueController {
    private static final String RECEPTION = "hasAnyRole('STAFF','OWNER','ADMIN') and hasAuthority('booking:update')";
    private static final String CLINICIAN = "hasAnyRole('VETERINARIAN','STAFF') and hasAuthority('booking:update')";
    private final VisitQueue queue;
    private final BookingService bookings;

    public record Contact(@NotBlank String contact) {}
    public record Slot(@NotNull UUID slotId) {}

    @GetMapping
    @PreAuthorize(RECEPTION)
    public ApiResponse<List<VisitQueue.Visit>> reception(@RequestParam LocalDate date) {
        return ApiResponse.ok(queue.list(date, null, false));
    }

    @GetMapping("/pending")
    @PreAuthorize(RECEPTION)
    public ApiResponse<List<VisitQueue.Visit>> pending() {
        return ApiResponse.ok(queue.list(LocalDate.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh")), null, true));
    }

    public record Assignment(@NotNull UUID expectedSlotId, @NotNull UUID targetSlotId, boolean customerAgreed) {}

    @GetMapping("/{id}/{itemId}/candidates")
    @PreAuthorize(RECEPTION)
    public ApiResponse<List<BookingService.WorkerOption>> candidates(@PathVariable UUID id, @PathVariable UUID itemId) {
        return ApiResponse.ok(bookings.assignmentOptions(id, itemId));
    }

    @PostMapping("/{id}/{itemId}/assign")
    @PreAuthorize(RECEPTION)
    public ApiResponse<BookingResponse> assign(@AuthenticationPrincipal UserPrincipal user, @PathVariable UUID id,
            @PathVariable UUID itemId, @Valid @RequestBody Assignment body) {
        return ApiResponse.ok(bookings.assign(user.getId(), id, itemId, body.expectedSlotId(),
                body.targetSlotId(), body.customerAgreed()));
    }

    @GetMapping("/mine")
    @PreAuthorize(CLINICIAN)
    public ApiResponse<List<VisitQueue.Visit>> assigned(@AuthenticationPrincipal UserPrincipal user,
                                                        @RequestParam LocalDate date) {
        return ApiResponse.ok(queue.list(date, user.getId(), false));
    }

    @PostMapping("/client-pets")
    @PreAuthorize(RECEPTION)
    public ApiResponse<List<VisitQueue.ClientPet>> clientPets(@Valid @RequestBody Contact body) {
        return ApiResponse.ok(queue.findClientPets(body.contact()));
    }

    @GetMapping("/clients")
    @PreAuthorize(RECEPTION)
    public ApiResponse<List<VisitQueue.Client>> clients(@RequestParam(defaultValue = "") String search) {
        return ApiResponse.ok(queue.clients(search));
    }

    @PostMapping("/walk-in/{customerId}")
    @PreAuthorize(RECEPTION)
    public ApiResponse<BookingResponse> walkIn(@AuthenticationPrincipal UserPrincipal user,
            @PathVariable UUID customerId, @Valid @RequestBody CreateBookingRequest body) {
        return ApiResponse.ok(bookings.walkIn(user.getId(), customerId, body));
    }

    @PostMapping("/{id}/no-show")
    @PreAuthorize(RECEPTION)
    public ApiResponse<BookingResponse> noShow(@AuthenticationPrincipal UserPrincipal user, @PathVariable UUID id) {
        return ApiResponse.ok(bookings.markNoShow(user.getId(), id));
    }

    @PostMapping("/{id}/{itemId}/check-in")
    @PreAuthorize(RECEPTION)
    public ApiResponse<Void> checkIn(@AuthenticationPrincipal UserPrincipal user, @PathVariable UUID id,
            @PathVariable UUID itemId, @Valid @RequestBody Slot body) {
        bookings.checkIn(user.getId(), id, itemId, body.slotId());
        return ApiResponse.ok(null);
    }

    @PostMapping("/{id}/{itemId}/start")
    @PreAuthorize(CLINICIAN)
    public ApiResponse<Void> start(@AuthenticationPrincipal UserPrincipal user, @PathVariable UUID id,
                                   @PathVariable UUID itemId) {
        bookings.attend(user.getId(), id, itemId, false);
        return ApiResponse.ok(null);
    }

    @PostMapping("/{id}/{itemId}/complete")
    @PreAuthorize(CLINICIAN)
    public ApiResponse<Void> complete(@AuthenticationPrincipal UserPrincipal user, @PathVariable UUID id,
                                      @PathVariable UUID itemId) {
        bookings.attend(user.getId(), id, itemId, true);
        return ApiResponse.ok(null);
    }
}
