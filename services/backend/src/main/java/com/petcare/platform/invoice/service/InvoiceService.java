package com.petcare.platform.invoice.service;

import com.petcare.platform.booking.domain.Booking;
import com.petcare.platform.booking.domain.BookingItem;
import com.petcare.platform.booking.domain.BookingStatus;
import com.petcare.platform.booking.repository.BookingItemRepository;
import com.petcare.platform.booking.repository.BookingRepository;
import com.petcare.platform.common.event.RabbitMQQueues;
import com.petcare.platform.common.exception.BusinessException;
import com.petcare.platform.common.exception.ConflictException;
import com.petcare.platform.common.exception.ResourceNotFoundException;
import com.petcare.platform.common.outbox.OutboxService;
import com.petcare.platform.common.security.SecurityUtils;
import com.petcare.platform.invoice.domain.Invoice;
import com.petcare.platform.invoice.domain.InvoiceItem;
import com.petcare.platform.invoice.domain.InvoiceStatus;
import com.petcare.platform.invoice.dto.InvoiceResponse;
import com.petcare.platform.invoice.dto.InvoiceResponse.ItemResponse;
import com.petcare.platform.invoice.event.InvoiceIssuedData;
import com.petcare.platform.invoice.repository.InvoiceItemRepository;
import com.petcare.platform.invoice.repository.InvoiceRepository;
import com.petcare.platform.servicecatalog.domain.CareService;
import com.petcare.platform.servicecatalog.repository.CareServiceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InvoiceService {

    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter PERIOD = DateTimeFormatter.ofPattern("yyyyMM");
    private static final String CURRENCY = "VND";

    private final InvoiceRepository invoiceRepository;
    private final InvoiceItemRepository itemRepository;
    private final BookingRepository bookingRepository;
    private final BookingItemRepository bookingItemRepository;
    private final CareServiceRepository careServiceRepository;
    private final OutboxService outboxService;

    // ─── Lập hóa đơn ───────────────────────────────────────────────────────

    @Transactional
    public InvoiceResponse issue(UUID bookingId) {
        // Khóa dòng lịch hẹn: hai yêu cầu lập hóa đơn cùng lúc phải xếp hàng
        Booking booking = bookingRepository.findByIdForUpdate(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking", bookingId));

        if (booking.getStatus() != BookingStatus.COMPLETED) {
            throw new BusinessException("An invoice can only be issued for a completed booking");
        }
        if (invoiceRepository.existsByBookingId(bookingId)) {
            throw new ConflictException("INVOICE_ALREADY_EXISTS");
        }

        List<BookingItem> bookingItems = bookingItemRepository.findByBookingId(bookingId);
        Map<UUID, String> serviceNames = careServiceRepository
                .findAllById(bookingItems.stream().map(BookingItem::getServiceId).distinct().toList())
                .stream()
                .collect(Collectors.toMap(CareService::getId, CareService::getName));

        // Tiền do server tính từ giá đã chụp lại, client không gửi giá
        BigDecimal total = bookingItems.stream()
                .map(BookingItem::getUnitPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (total.signum() <= 0) {
            throw new BusinessException("Invoice total must be greater than zero");
        }

        Instant now = Instant.now();
        String number = "INV-" + now.atZone(ZONE).format(PERIOD) + "-"
                + String.format("%06d", invoiceRepository.nextInvoiceSequence());

        Invoice invoice = invoiceRepository.save(Invoice.builder()
                .bookingId(bookingId)
                .invoiceNumber(number)
                .totalAmount(total)
                .issuedAt(now)
                .status(InvoiceStatus.ISSUED)
                .build());

        List<InvoiceItem> items = bookingItems.stream()
                .map(bi -> InvoiceItem.builder()
                        .invoiceId(invoice.getId())
                        .description(serviceNames.getOrDefault(bi.getServiceId(), "Service"))
                        .quantity(1)
                        .unitPrice(bi.getUnitPrice())
                        .subtotal(bi.getUnitPrice())
                        .createdAt(now)
                        .build())
                .toList();
        itemRepository.saveAll(items);

        // Sự kiện ghi cùng giao dịch (outbox), payment-service sẽ nhận và tạo khoản thanh toán
        outboxService.append("Invoice", invoice.getId(),
                RabbitMQQueues.INVOICE_EXCHANGE, RabbitMQQueues.INVOICE_ISSUED,
                new InvoiceIssuedData(invoice.getId(), number, bookingId, booking.getCustomerId(),
                        total, CURRENCY, now));

        return toResponse(invoice, items);
    }

    // ─── Xem ───────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public InvoiceResponse get(UUID userId, UUID id) {
        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice", id));
        requireAccess(userId, invoice);
        return toResponse(invoice, itemRepository.findByInvoiceIdOrderByCreatedAtAsc(id));
    }

    @Transactional(readOnly = true)
    public InvoiceResponse getByBooking(UUID userId, UUID bookingId) {
        Invoice invoice = invoiceRepository.findByBookingId(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice for booking", bookingId));
        requireAccess(userId, invoice);
        return toResponse(invoice, itemRepository.findByInvoiceIdOrderByCreatedAtAsc(invoice.getId()));
    }

    @Transactional(readOnly = true)
    public Page<InvoiceResponse> list(UUID userId, Pageable pageable) {
        Page<Invoice> page = isFinanceSide()
                ? invoiceRepository.findAll(pageable)
                : invoiceRepository.findByCustomer(userId, pageable);

        Map<UUID, List<InvoiceItem>> itemsByInvoice = itemRepository
                .findByInvoiceIdIn(page.getContent().stream().map(Invoice::getId).toList())
                .stream()
                .collect(Collectors.groupingBy(InvoiceItem::getInvoiceId));

        return page.map(i -> toResponse(i, itemsByInvoice.getOrDefault(i.getId(), List.of())));
    }

    // ─── Hàm phụ ───────────────────────────────────────────────────────────

    private boolean isFinanceSide() {
        return SecurityUtils.hasAnyRole("ADMIN", "OWNER", "STAFF");
    }

    // Khách hàng chỉ thấy hóa đơn của lịch hẹn mình; hóa đơn của người khác báo "không tìm thấy"
    private void requireAccess(UUID userId, Invoice invoice) {
        if (isFinanceSide()) {
            return;
        }
        Booking booking = bookingRepository.findById(invoice.getBookingId())
                .orElseThrow(() -> new ResourceNotFoundException("Invoice", invoice.getId()));
        if (!booking.getCustomerId().equals(userId)) {
            throw new ResourceNotFoundException("Invoice", invoice.getId());
        }
    }

    private InvoiceResponse toResponse(Invoice invoice, List<InvoiceItem> items) {
        List<ItemResponse> itemResponses = items.stream()
                .map(i -> new ItemResponse(i.getDescription(), i.getQuantity(), i.getUnitPrice(), i.getSubtotal()))
                .toList();
        return new InvoiceResponse(invoice.getId(), invoice.getBookingId(), invoice.getInvoiceNumber(),
                invoice.getStatus().name(), invoice.getTotalAmount(), CURRENCY,
                invoice.getIssuedAt(), itemResponses);
    }
}