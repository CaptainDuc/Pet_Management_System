package com.petcare.platform.common.internal;

import com.petcare.platform.booking.domain.Booking;
import com.petcare.platform.booking.domain.PaymentStatus;
import com.petcare.platform.booking.repository.BookingRepository;
import com.petcare.platform.invoice.domain.Invoice;
import com.petcare.platform.invoice.domain.InvoiceStatus;
import com.petcare.platform.invoice.repository.InvoiceRepository;
import com.petcare.platform.loyalty.service.LoyaltyService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;
import java.util.Map;
import java.util.UUID;

/**
 * Service-to-service payable lookup. The payment service calls these endpoints
 * with {@code X-Internal-Key} and never trusts an amount supplied by the browser.
 */
@RestController
@RequestMapping("/api/v1/internal")
@RequiredArgsConstructor
public class InternalPayableController {

    private final BookingRepository bookingRepository;
    private final InvoiceRepository invoiceRepository;
    private final LoyaltyService loyaltyService;

    @Value("${app.internal.api-key:petcare_internal_dev_key}")
    private String internalApiKey;

    @GetMapping("/bookings/{id}/payable")
    public PayableResponse bookingPayable(
            @PathVariable UUID id,
            @RequestHeader(value = "X-Internal-Key", required = false) String key) {
        requireKey(key);
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));
        rejectCancelled(booking);
        boolean paid = booking.getPaymentStatus() == PaymentStatus.PAID;
        return new PayableResponse(booking.getId(), null, bookingReference(booking.getId()),
                booking.getTotalAmount(), booking.getPaymentStatus().name(), paid, 0);
    }

    @GetMapping("/invoices/{id}/payable")
    public PayableResponse invoicePayable(
            @PathVariable UUID id,
            @RequestHeader(value = "X-Internal-Key", required = false) String key) {
        requireKey(key);
        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invoice not found"));
        bookingRepository.findById(invoice.getBookingId()).ifPresent(this::rejectCancelled);
        boolean paid = invoice.getStatus() == InvoiceStatus.PAID;
        return new PayableResponse(invoice.getBookingId(), invoice.getId(), invoice.getInvoiceNumber(),
                invoice.getTotalAmount(), invoice.getStatus().name(), paid, 0);
    }

    @GetMapping("/loyalty/discount/{userId}")
    public Map<String, Object> getUserDiscount(
            @PathVariable UUID userId,
            @RequestHeader(value = "X-Internal-Key", required = false) String key) {
        requireKey(key);
        var account = loyaltyService.getOrCreateAccount(userId);
        int discount = loyaltyService.getDiscountPercent(account.getTier());
        return Map.of("discountPercent", discount);
    }

    private int getDiscountForCustomer(UUID customerId) {
        if (customerId == null) return 0;
        try {
            var account = loyaltyService.getOrCreateAccount(customerId);
            return loyaltyService.getDiscountPercent(account.getTier());
        } catch (Exception e) {
            return 0;
        }
    }

    private void rejectCancelled(Booking booking) {
        if ("CANCELLED".equals(booking.getStatus().name())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Booking cancelled");
        }
    }

    private void requireKey(String key) {
        if (key == null || !key.equals(internalApiKey)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid internal API key");
        }
    }

    private String bookingReference(UUID id) {
        return "BK-" + id.toString().substring(0, 8).toUpperCase(Locale.ROOT);
    }
}
