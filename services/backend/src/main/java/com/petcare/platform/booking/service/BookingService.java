package com.petcare.platform.booking.service;

import com.petcare.platform.invoice.repository.InvoiceRepository;
import com.petcare.platform.invoice.domain.InvoiceStatus;
import com.petcare.platform.booking.event.BookingEventData;
import com.petcare.platform.common.event.RabbitMQQueues;
import com.petcare.platform.common.outbox.OutboxService;
import java.time.OffsetDateTime;
import com.petcare.platform.booking.domain.Booking;
import com.petcare.platform.booking.domain.BookingItem;
import com.petcare.platform.booking.domain.BookingStatus;
import com.petcare.platform.booking.domain.BookingStatusHistory;
import com.petcare.platform.booking.domain.PaymentStatus;
import com.petcare.platform.booking.dto.BookingItemRequest;
import com.petcare.platform.booking.dto.BookingResponse;
import com.petcare.platform.booking.dto.BookingResponse.ItemResponse;
import com.petcare.platform.booking.dto.CreateBookingRequest;
import com.petcare.platform.booking.repository.BookingItemRepository;
import com.petcare.platform.booking.repository.BookingRepository;
import com.petcare.platform.booking.repository.BookingStatusHistoryRepository;
import com.petcare.platform.common.exception.BusinessException;
import com.petcare.platform.common.exception.ConflictException;
import com.petcare.platform.common.exception.ResourceNotFoundException;
import com.petcare.platform.common.security.SecurityUtils;
import com.petcare.platform.pet.domain.Pet;
import com.petcare.platform.pet.repository.PetRepository;
import com.petcare.platform.promotion.domain.Promotion;
import com.petcare.platform.promotion.dto.AppliedPromotion;
import com.petcare.platform.promotion.repository.PromotionRepository;
import com.petcare.platform.promotion.service.PromotionService;
import com.petcare.platform.schedule.domain.Schedule;
import com.petcare.platform.schedule.domain.TimeSlot;
import com.petcare.platform.schedule.service.SlotWindow;
import com.petcare.platform.schedule.repository.ScheduleRepository;
import com.petcare.platform.schedule.repository.TimeSlotRepository;
import com.petcare.platform.servicecatalog.domain.CareService;
import com.petcare.platform.servicecatalog.repository.CareServiceRepository;
import com.petcare.platform.staff.domain.Staff;
import com.petcare.platform.staff.repository.StaffRepository;
import com.petcare.platform.staff.repository.StaffSkillRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class BookingService {

    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    // Máy trạng thái (hợp đồng API, mục H.4)
    private static final Map<BookingStatus, Set<BookingStatus>> ALLOWED = Map.of(
            BookingStatus.PENDING, Set.of(BookingStatus.CONFIRMED, BookingStatus.CANCELLED),
            BookingStatus.CONFIRMED, Set.of(BookingStatus.IN_PROGRESS, BookingStatus.CANCELLED),
            BookingStatus.IN_PROGRESS, Set.of(BookingStatus.COMPLETED, BookingStatus.CANCELLED));

    private final InvoiceRepository invoiceRepository;
    private final BookingRepository bookingRepository;
    private final BookingItemRepository itemRepository;
    private final BookingStatusHistoryRepository historyRepository;
    private final PetRepository petRepository;
    private final CareServiceRepository careServiceRepository;
    private final StaffRepository staffRepository;
    private final StaffSkillRepository skillRepository;
    private final ScheduleRepository scheduleRepository;
    private final TimeSlotRepository timeSlotRepository;
    private final OutboxService outboxService;
    private final PromotionService promotionService;
    private final PromotionRepository promotionRepository;

    @Value("${app.booking.cancel-cutoff-hours:2}")
    private int cancelCutoffHours;

    private record PlannedItem(CareService service, UUID slotId, List<UUID> reservedSlots, UUID staffId, String notes) {}

    // ─── Đặt lịch ──────────────────────────────────────────────────────────

    @Transactional
    public BookingResponse create(UUID customerId, CreateBookingRequest request) {
        Pet pet = petRepository.findByIdAndActiveTrue(request.petId())
                .orElseThrow(() -> new ResourceNotFoundException("Pet", request.petId()));
        if (!pet.getOwnerId().equals(customerId)) {
            throw new AccessDeniedException("Access denied");
        }

        // 1. Kiểm tra toàn bộ các mục trước khi giữ chỗ
        Instant now = Instant.now();
        List<PlannedItem> planned = new ArrayList<>();
        for (BookingItemRequest item : request.items()) {
            CareService service = careServiceRepository.findByIdAndActiveTrue(item.serviceId())
                    .orElseThrow(() -> new ResourceNotFoundException("Service", item.serviceId()));
            TimeSlot slot = timeSlotRepository.findById(item.timeSlotId())
                    .orElseThrow(() -> new ResourceNotFoundException("Time slot", item.timeSlotId()));

            if (!slot.getStartTime().isAfter(now)) {
                throw new BusinessException("Slot is in the past");
            }
            if (slot.getScheduleId() == null) {
                throw new BusinessException("Slot does not belong to a schedule");
            }
            Schedule schedule = scheduleRepository.findById(slot.getScheduleId())
                    .orElseThrow(() -> new ResourceNotFoundException("Schedule", slot.getScheduleId()));
            if (!schedule.isAvailable()) {
                throw new BusinessException("Schedule is not available");
            }

            UUID staffId = item.staffId() != null ? item.staffId() : schedule.getStaffId();
            if (!staffId.equals(schedule.getStaffId())) {
                throw new BusinessException("Slot does not belong to the requested staff");
            }
            Staff staff = staffRepository.findById(staffId)
                    .orElseThrow(() -> new ResourceNotFoundException("Staff", staffId));
            if (!staff.isActive()) {
                throw new BusinessException("Staff is not active");
            }
            if (request.branchId() != null && !request.branchId().equals(staff.getBranchId())) {
                throw new BusinessException("Staff does not belong to this branch");
            }
            if (skillRepository.findByStaffIdAndServiceId(staffId, service.getId()).isEmpty()) {
                throw new BusinessException("Staff does not provide this service");
            }
            List<TimeSlot> window = SlotWindow.covering(
                    timeSlotRepository.findByScheduleIdInOrderByStartTimeAsc(List.of(schedule.getId())),
                    slot, service.getDurationMinutes());
            if (window.isEmpty()) {
                throw new BusinessException("Not enough consecutive slots for this service");
            }
            planned.add(new PlannedItem(service, slot.getId(), window.stream().map(TimeSlot::getId).toList(), staffId, item.notes()));
        }

        // 2. Giữ chỗ nguyên tử, theo thứ tự id để tránh khóa chéo giữa hai giao dịch
        List<UUID> reservations = planned.stream().flatMap(item -> item.reservedSlots().stream()).toList();
        if (reservations.stream().distinct().count() != reservations.size()) {
            throw new BusinessException("Booking services overlap in time");
        }
        reservations.stream().sorted().forEach(slotId -> {
            if (timeSlotRepository.markBooked(slotId) == 0) {
                throw new ConflictException("SLOT_ALREADY_BOOKED");
            }
        });

        // 3. Lưu lịch hẹn, giá được chụp lại từ dịch vụ
        BigDecimal subtotal = planned.stream()
                .map(p -> p.service().getBasePrice())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Booking booking = new Booking();
        booking.setCustomerId(customerId);
        booking.setPetId(request.petId());
        booking.setBranchId(request.branchId());
        booking.setNotes(request.notes());
        booking.setTotalAmount(subtotal);
        booking = bookingRepository.save(booking);

        // 4. Áp mã giảm giá (nếu có). Server luôn tự tính lại số tiền.
        if (request.promotionCode() != null && !request.promotionCode().isBlank()) {
            AppliedPromotion applied = promotionService.reserve(
                    request.promotionCode(), subtotal, booking.getId());
            booking.setPromotionId(applied.promotionId());
            booking.setDiscountAmount(applied.discountAmount());
            booking.setTotalAmount(applied.finalAmount());
            booking = bookingRepository.save(booking);
        }

        for (PlannedItem p : planned) {
            BookingItem item = new BookingItem();
            item.setBookingId(booking.getId());
            item.setServiceId(p.service().getId());
            item.setStaffId(p.staffId());
            item.setTimeSlotId(p.slotId());
            item.setReservedSlotIds(new java.util.HashSet<>(p.reservedSlots()));
            item.setUnitPrice(p.service().getBasePrice());
            item.setNotes(p.notes());
            itemRepository.save(item);
        }
                historyRepository.save(new BookingStatusHistory(
                booking.getId(), null, BookingStatus.PENDING, customerId, null));

        BookingResponse response = toResponses(List.of(booking)).get(0);
        recordEvent(response, RabbitMQQueues.BOOKING_CREATED, null);
        return response;
    }


    // ─── Xem ───────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<BookingResponse> list(UUID userId, BookingStatus status, UUID petId,
                                      UUID customerId, Pageable pageable) {
        // Khách hàng chỉ thấy lịch của mình; phía phòng khám được lọc theo customerId
        final UUID ownerFilter = isClinicSide() ? customerId : userId;

        Specification<Booking> spec = (root, query, cb) -> cb.conjunction();
        if (ownerFilter != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("customerId"), ownerFilter));
        }
        if (status != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status));
        }
        if (petId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("petId"), petId));
        }

        Page<Booking> page = bookingRepository.findAll(spec, pageable);
        return new PageImpl<>(toResponses(page.getContent()), pageable, page.getTotalElements());
    }

    @Transactional(readOnly = true)
    public BookingResponse get(UUID userId, UUID id) {
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Booking", id));
        if (!isClinicSide() && !booking.getCustomerId().equals(userId)) {
            throw new ResourceNotFoundException("Booking", id);
        }
        return toResponses(List.of(booking)).get(0);
    }

    // ─── Đổi trạng thái ────────────────────────────────────────────────────

    @Transactional
    public BookingResponse confirm(UUID userId, UUID id) {
        return transition(userId, id, BookingStatus.CONFIRMED, null);
    }

    @Transactional
    public BookingResponse start(UUID userId, UUID id) {
        return transition(userId, id, BookingStatus.IN_PROGRESS, null);
    }

    @Transactional
    public BookingResponse complete(UUID userId, UUID id) {
        return transition(userId, id, BookingStatus.COMPLETED, null);
    }

    @Transactional
    public BookingResponse cancel(UUID userId, UUID id, String reason) {
        return transition(userId, id, BookingStatus.CANCELLED, reason);
    }

    // ─── Thanh toán & phản hồi của phòng khám ─────────────────────────────

    @Transactional
    public BookingResponse markPaidAtCounter(UUID userId, UUID id) {
        if (!isClinicSide()) {
            throw new AccessDeniedException("Access denied");
        }
        Booking booking = bookingRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Booking", id));
        if (booking.getPaymentStatus() == PaymentStatus.PAID) {
            return toResponses(List.of(booking)).get(0);
        }
        if (booking.getStatus() == BookingStatus.CANCELLED) {
            throw new BusinessException("Cannot collect payment for a cancelled booking");
        }

        boolean autoConfirm = applyPayment(booking, userId, "CASH", null, Instant.now());
        BookingResponse response = toResponses(List.of(booking)).get(0);
        if (autoConfirm) {
            recordEvent(response, RabbitMQQueues.BOOKING_CONFIRMED, null);
        }
        recordEvent(response, RabbitMQQueues.BOOKING_PAID, null);
        return response;
    }

    /**
     * Applies a {@code payment.completed} event from the payment service.
     * Idempotent: a booking that is already PAID is left untouched.
     */
    @Transactional
    public boolean applyOnlinePayment(UUID id, String orderCode, BigDecimal amount, Instant paidAt) {
        Booking booking = bookingRepository.findByIdForUpdate(id).orElse(null);
        if (booking == null) {
            log.warn("payment.completed for unknown booking {}", id);
            return false;
        }
        if (booking.getPaymentStatus() == PaymentStatus.PAID) {
            return false;
        }
        if (booking.getStatus() == BookingStatus.CANCELLED) {
            log.warn("payment.completed for cancelled booking {}", id);
            return false;
        }
        if (amount != null && booking.getTotalAmount() != null
                && amount.compareTo(booking.getTotalAmount()) < 0) {
            log.warn("payment.completed amount {} is lower than booking {} total {}",
                    amount, id, booking.getTotalAmount());
            return false;
        }

        Instant paidTime = paidAt != null ? paidAt : Instant.now();
        boolean autoConfirm = applyPayment(
                booking, booking.getCustomerId(), "ONLINE", orderCode, paidTime);
        BookingResponse response = toResponses(List.of(booking)).get(0);
        if (autoConfirm) {
            recordEvent(response, RabbitMQQueues.BOOKING_CONFIRMED, null);
        }
        recordEvent(response, RabbitMQQueues.BOOKING_PAID, null);
        return true;
    }

    @Transactional
    public BookingResponse reportIssue(UUID id, String message) {
        if (message == null || message.isBlank()) {
            throw new BusinessException("Vui lòng nhập nội dung cần báo cho khách hàng");
        }
        Booking booking = bookingRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Booking", id));
        booking.setStaffNote(message.trim());
        booking.setStaffNoteAt(Instant.now());
        bookingRepository.save(booking);
        BookingResponse response = toResponses(List.of(booking)).get(0);
        recordEvent(response, RabbitMQQueues.BOOKING_ISSUE, message.trim());
        return response;
    }

    private boolean applyPayment(Booking booking, UUID actorId, String method,
                                 String orderCode, Instant paidAt) {
        boolean autoConfirm = booking.getStatus() == BookingStatus.PENDING;
        booking.setPaymentStatus(PaymentStatus.PAID);
        booking.setPaymentMethod(method);
        booking.setPaidAt(paidAt);
        booking.setPaymentOrderCode(orderCode);
        if (autoConfirm) {
            booking.setStatus(BookingStatus.CONFIRMED);
            itemRepository.findByBookingId(booking.getId())
                    .forEach(i -> i.setStatus(BookingStatus.CONFIRMED));
            historyRepository.save(new BookingStatusHistory(
                    booking.getId(), BookingStatus.PENDING, BookingStatus.CONFIRMED,
                    actorId, null));
        }
        invoiceRepository.findByBookingId(booking.getId()).ifPresent(invoice -> {
            if (invoice.getStatus() != InvoiceStatus.PAID) {
                invoice.setStatus(InvoiceStatus.PAID);
                invoiceRepository.save(invoice);
            }
        });
        bookingRepository.save(booking);
        promotionService.consume(booking.getId());
        return autoConfirm;
    }

    private BookingResponse transition(UUID userId, UUID id, BookingStatus to, String reason) {
        Booking booking = bookingRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Booking", id));

        boolean clinic = isClinicSide();
        if (!clinic && !booking.getCustomerId().equals(userId)) {
            throw new ResourceNotFoundException("Booking", id);
        }

        BookingStatus from = booking.getStatus();
        if (!ALLOWED.getOrDefault(from, Set.of()).contains(to)) {
            throw new ConflictException("BOOKING_INVALID_TRANSITION");
        }
        // Khách hàng chỉ được hủy; xác nhận, bắt đầu, hoàn thành là việc của phòng khám
        if (to != BookingStatus.CANCELLED && !clinic) {
            throw new AccessDeniedException("Access denied");
        }

        List<BookingItem> items = itemRepository.findByBookingId(id);
        List<UUID> slotIds = items.stream()
                .flatMap(i -> reservedSlots(i).stream())
                .distinct()
                .toList();
        Instant earliest = timeSlotRepository.findAllById(slotIds).stream()
                .map(TimeSlot::getStartTime)
                .min(Comparator.naturalOrder())
                .orElse(null);

        if (to == BookingStatus.IN_PROGRESS && earliest != null && earliest.isAfter(Instant.now())) {
            throw new BusinessException("Cannot start before the appointment time");
        }

        if (to == BookingStatus.CANCELLED) {
            if (booking.getPaymentStatus() == PaymentStatus.PAID
                    && !SecurityUtils.hasAnyRole("OWNER", "ADMIN")) {
                throw new ConflictException("BOOKING_ALREADY_PAID");
            }
            if (from == BookingStatus.IN_PROGRESS && !SecurityUtils.hasRole("ADMIN")) {
                throw new AccessDeniedException("Access denied");
            }
            if (!clinic && earliest != null
                    && Instant.now().plus(cancelCutoffHours, ChronoUnit.HOURS).isAfter(earliest)) {
                throw new BusinessException("Cancellation is only allowed at least "
                        + cancelCutoffHours + " hours before the appointment");
            }
        }

        booking.setStatus(to);
        items.forEach(i -> i.setStatus(to));
        historyRepository.save(new BookingStatusHistory(
                id, from, to, userId, to == BookingStatus.CANCELLED ? reason : null));

        if (to == BookingStatus.CANCELLED) {
            if (!slotIds.isEmpty()) {
                timeSlotRepository.release(slotIds);
            }
            promotionService.release(id);
        }
        BookingResponse response = toResponses(List.of(booking)).get(0);
        recordEvent(response, routingKeyFor(to), reason);
        return response;
    }
    

    // ─── Hàm phụ ───────────────────────────────────────────────────────────

    private boolean isClinicSide() {
        return SecurityUtils.hasAnyRole("ADMIN", "OWNER", "STAFF", "VETERINARIAN");
    }

        private void recordEvent(BookingResponse r, String routingKey, String reason) {
        OffsetDateTime start = r.items().stream()
                .map(ItemResponse::startTime)
                .filter(Objects::nonNull)
                .min(Comparator.naturalOrder())
                .orElse(null);
        List<String> serviceNames = r.items().stream()
                .map(ItemResponse::serviceName)
                .filter(Objects::nonNull)
                .toList();

        outboxService.append("Booking", r.id(), RabbitMQQueues.BOOKING_EXCHANGE, routingKey,
                new BookingEventData(r.id(), r.customerId(), r.petId(), r.status(),
                        r.totalAmount(), start, serviceNames, reason));
    }

    private String routingKeyFor(BookingStatus status) {
        return switch (status) {
            case CONFIRMED -> RabbitMQQueues.BOOKING_CONFIRMED;
            case IN_PROGRESS -> RabbitMQQueues.BOOKING_STARTED;
            case COMPLETED -> RabbitMQQueues.BOOKING_COMPLETED;
            case CANCELLED -> RabbitMQQueues.BOOKING_CANCELLED;
            default -> throw new IllegalStateException("No event for status " + status);
        };
    }

    private List<BookingResponse> toResponses(List<Booking> bookings) {
        if (bookings.isEmpty()) {
            return List.of();
        }
        Map<UUID, List<BookingItem>> itemsByBooking = itemRepository
                .findByBookingIdIn(bookings.stream().map(Booking::getId).toList())
                .stream()
                .collect(Collectors.groupingBy(BookingItem::getBookingId));
        List<BookingItem> all = itemsByBooking.values().stream().flatMap(List::stream).toList();

        Map<UUID, CareService> services = careServiceRepository
                .findAllById(all.stream().map(BookingItem::getServiceId).distinct().toList())
                .stream().collect(Collectors.toMap(CareService::getId, s -> s));
        Map<UUID, TimeSlot> slots = timeSlotRepository
                .findAllById(all.stream().flatMap(i -> reservedSlots(i).stream()).distinct().toList())
                .stream().collect(Collectors.toMap(TimeSlot::getId, t -> t));
        Map<UUID, Promotion> promotions = promotionRepository
                .findAllById(bookings.stream().map(Booking::getPromotionId)
                        .filter(Objects::nonNull).distinct().toList())
                .stream().collect(Collectors.toMap(Promotion::getId, p -> p));

        return bookings.stream().map(b -> {
            List<ItemResponse> itemResponses = itemsByBooking.getOrDefault(b.getId(), List.of())
                    .stream().map(i -> {
                        CareService service = services.get(i.getServiceId());
                        TimeSlot slot = i.getTimeSlotId() == null ? null : slots.get(i.getTimeSlotId());
                        Instant endTime = reservedSlots(i).stream().map(slots::get).filter(Objects::nonNull)
                                .map(TimeSlot::getEndTime).max(Instant::compareTo).orElse(null);
                        return new ItemResponse(
                                i.getId(), i.getServiceId(),
                                service == null ? null : service.getName(),
                                i.getStaffId(), i.getTimeSlotId(),
                                slot == null ? null : slot.getStartTime().atZone(ZONE).toOffsetDateTime(),
                                endTime == null ? null : endTime.atZone(ZONE).toOffsetDateTime(),
                                i.getStatus().name(), i.getUnitPrice(), i.getNotes());
                    }).toList();
            Promotion promotion = b.getPromotionId() == null ? null : promotions.get(b.getPromotionId());
            return new BookingResponse(b.getId(), b.getCustomerId(), b.getPetId(), b.getBranchId(),
                    b.getPromotionId(), promotion == null ? null : promotion.getCode(),
                    b.getStatus().name(), b.getTotalAmount(), b.getDiscountAmount(),
                    b.getPaymentStatus().name(), b.getPaymentMethod(), b.getPaidAt(),
                    b.getStaffNote(), b.getNotes(), itemResponses,
                    b.getCreatedAt(), b.getUpdatedAt());
        }).toList();
    }

    private Set<UUID> reservedSlots(BookingItem item) {
        if (!item.getReservedSlotIds().isEmpty()) return item.getReservedSlotIds();
        return item.getTimeSlotId() == null ? Set.of() : Set.of(item.getTimeSlotId());
    }
}
