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
import com.petcare.platform.user.repository.UserRepository;
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
import com.petcare.platform.loyalty.service.LoyaltyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import com.petcare.platform.schedule.service.ScheduleService;
import com.petcare.platform.schedule.dto.AvailableSlotsResponse;
import com.petcare.platform.schedule.dto.AvailableSlotsResponse.StaffSlots;
import java.time.Duration;
import java.time.LocalDate;
import java.time.Instant;
import java.time.ZoneId;
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
    private final UserRepository userRepository;
    private final CareServiceRepository careServiceRepository;
    private final StaffRepository staffRepository;
    private final ScheduleService scheduleService;
    private final ScheduleRepository scheduleRepository;
    private final TimeSlotRepository timeSlotRepository;
    private final OutboxService outboxService;
    private final PromotionService promotionService;
    private final PromotionRepository promotionRepository;
    private final LoyaltyService loyaltyService;

    private record PlannedItem(CareService service, UUID slotId, List<UUID> reservedSlots, UUID staffId, UUID preference, String notes) {}

    // ─── Đặt lịch ──────────────────────────────────────────────────────────

    @Transactional
    public BookingResponse create(UUID customerId, CreateBookingRequest request) {
        return create(customerId, request, false);
    }

    private BookingResponse create(UUID customerId, CreateBookingRequest request, boolean walkIn) {
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
            Schedule schedule = scheduleRepository.lockForBooking(slot.getScheduleId())
                    .orElseThrow(() -> new ResourceNotFoundException("Schedule", slot.getScheduleId()));
            if (!schedule.isAvailable()) {
                throw new BusinessException("Schedule is not available");
            }

            UUID staffId = item.staffId() != null ? item.staffId() : schedule.getStaffId();
            if (!staffId.equals(schedule.getStaffId())) {
                throw new BusinessException("Slot does not belong to the requested staff");
            }
            Staff staff = staffRepository.findBookable(staffId, service.getId())
                    .orElseThrow(() -> new BusinessException("Nhân viên không thể nhận dịch vụ này."));
            if (request.branchId() != null && !request.branchId().equals(staff.getBranchId())) {
                throw new BusinessException("Staff does not belong to this branch");
            }
            List<TimeSlot> window = SlotWindow.covering(
                    timeSlotRepository.findByScheduleIdInOrderByStartTimeAsc(List.of(schedule.getId())),
                    slot, service.getDurationMinutes());
            if (window.isEmpty()) {
                throw new BusinessException("Not enough consecutive slots for this service");
            }
            UUID preference = item.preferredStaffId() != null ? item.preferredStaffId() : item.staffId();
            if (preference != null && !preference.equals(staffId)) {
                throw new BusinessException("Khung giờ không thuộc người được yêu cầu.");
            }
            List<UUID> ids = window.stream().map(TimeSlot::getId).toList();
            if (!walkIn && preference == null && request.items().size() == 1) {
                // Lock whole windows before choosing: simultaneous requests can use different clinicians at the same hour.
                var chosen = windowsAt(slot, staff.getBranchId(), service.getId(), service.getDurationMinutes(), Set.of())
                        .stream().filter(w -> scheduleRepository.lockForBooking(w.scheduleId()).orElseThrow().isAvailable())
                        .filter(w -> timeSlotRepository.lockFreeSlots(w.ids()).size() == w.ids().size())
                        .findFirst().orElseThrow(() -> new ConflictException("SLOT_ALREADY_BOOKED"));
                planned.add(new PlannedItem(service, chosen.slotId(), chosen.ids(), null, null, item.notes()));
            } else {
                planned.add(new PlannedItem(service, slot.getId(), ids, walkIn ? staffId : null,
                        walkIn ? null : preference, item.notes()));
            }
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
                    request.promotionCode(), subtotal, booking.getId(), customerId);
            booking.setPromotionId(applied.promotionId());
            booking.setDiscountAmount(applied.discountAmount());
            booking.setTotalAmount(applied.finalAmount());
            booking = bookingRepository.save(booking);
        }

        // Snapshot the member benefit when the appointment is created. Every later
        // payment method and the invoice now use the same authoritative amount.
        int memberPercent = loyaltyService.getDiscountPercent(
                loyaltyService.getOrCreateAccount(customerId).getTier());
        if (memberPercent > 0) {
            BigDecimal memberDiscount = booking.getTotalAmount()
                    .multiply(BigDecimal.valueOf(memberPercent))
                    .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);
            booking.setDiscountAmount(booking.getDiscountAmount().add(memberDiscount));
            booking.setTotalAmount(booking.getTotalAmount().subtract(memberDiscount));
            booking = bookingRepository.save(booking);
        }

        for (PlannedItem p : planned) {
            BookingItem item = new BookingItem();
            item.setBookingId(booking.getId());
            item.setServiceId(p.service().getId());
            item.setStaffId(p.staffId());
            item.setPreferredStaffId(p.preference());
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

    @Transactional
    public BookingResponse markNoShow(UUID userId, UUID id) {
        if (!SecurityUtils.hasAnyRole("STAFF", "OWNER", "ADMIN")
                || !SecurityUtils.hasPermission("booking:update")) {
            throw new AccessDeniedException("Access denied");
        }
        Booking booking = bookingRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Booking", id));
        List<BookingItem> items = itemRepository.findByBookingId(id);
        if (items.stream().anyMatch(item -> item.getCheckedInAt() != null)) {
            throw new ConflictException("BOOKING_CUSTOMER_ALREADY_CHECKED_IN");
        }
        List<UUID> slotIds = items.stream().map(BookingItem::getTimeSlotId).distinct().toList();
        Instant earliest = timeSlotRepository.findAllById(slotIds).stream()
                .map(TimeSlot::getStartTime).min(Comparator.naturalOrder()).orElse(null);
        Instant now = Instant.now();
        if (!BookingNoShowPolicy.canMarkNoShow(booking.getStatus(), earliest, now)) {
            throw new ConflictException("BOOKING_NOT_ELIGIBLE_FOR_NO_SHOW");
        }
        booking.setStatus(BookingStatus.NO_SHOW);
        items.forEach(item -> item.setStatus(BookingStatus.NO_SHOW));
        historyRepository.save(new BookingStatusHistory(
                id, BookingStatus.CONFIRMED, BookingStatus.NO_SHOW, userId, "Khách không đến"));
        BookingResponse response = toResponses(List.of(booking)).getFirst();
        recordEvent(response, RabbitMQQueues.BOOKING_NO_SHOW, null);
        return response;
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
        // Allow discounted payments (loyalty tier discount). The payment service already validates
        // the order amount against the discounted payable amount.
        if (amount != null && booking.getTotalAmount() != null
                && amount.compareTo(booking.getTotalAmount()) > 0) {
            log.warn("payment.completed amount {} exceeds booking {} total {}",
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
        syncCompletedBookingLoyalty(booking);

        return autoConfirm;
    }

    @Transactional
    public BookingResponse walkIn(UUID receptionist, UUID customer, CreateBookingRequest request) {
        if (request.items().size() != 1) throw new BusinessException("Mỗi lượt tiếp nhận tại quầy cần chọn một dịch vụ.");
        BookingResponse created = create(customer, request, true);
        ItemResponse item = created.items().getFirst();
        checkIn(receptionist, created.id(), item.id(), item.timeSlotId());
        return get(receptionist, created.id());
    }

    private Booking lockVisit(UUID id) {
        return bookingRepository.findByIdForUpdate(id).orElseThrow(() -> new ResourceNotFoundException("Booking", id));
    }

    private BookingItem visitItem(List<BookingItem> items, UUID itemId) {
        return items.stream().filter(i -> i.getId().equals(itemId)).findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Booking item", itemId));
    }

    @Transactional
    public void checkIn(UUID userId, UUID id, UUID itemId, UUID expectedSlot) {
        Booking booking = lockVisit(id);
        BookingItem item = visitItem(itemRepository.findByBookingId(id), itemId);
        if (!expectedSlot.equals(item.getTimeSlotId()) || item.getStatus() == BookingStatus.CANCELLED) {
            throw new ConflictException("Lịch đã thay đổi. Vui lòng tải lại hàng đợi.");
        }
        if (item.getStaffId() == null) throw new ConflictException("Cần phân công trước khi tiếp đón.");
        if (item.getCheckedInAt() != null) return;
        if (!Set.of(BookingStatus.PENDING, BookingStatus.CONFIRMED).contains(item.getStatus())) {
            throw new ConflictException("Dịch vụ đã bắt đầu hoặc kết thúc.");
        }
        TimeSlot slot = timeSlotRepository.findById(expectedSlot)
                .orElseThrow(() -> new ResourceNotFoundException("Time slot", expectedSlot));
        if (!slot.getStartTime().atZone(ZONE).toLocalDate().equals(LocalDate.now(ZONE))) {
            throw new BusinessException("Chỉ tiếp đón vào ngày đã hẹn.");
        }
        if (booking.getStatus() == BookingStatus.PENDING) {
            transition(userId, id, BookingStatus.CONFIRMED, null);
        }
        item.setCheckedInAt(Instant.now());
        item.setCheckedInBy(userId);
    }

    @Transactional
    public void attend(UUID userId, UUID id, UUID itemId, boolean complete) {
        Booking booking = lockVisit(id);
        List<BookingItem> items = itemRepository.findByBookingId(id);
        BookingItem item = visitItem(items, itemId);
        if (item.getStaffId() == null || staffRepository.findByIdAndActiveTrue(item.getStaffId())
                .filter(s -> userId.equals(s.getUserId())).isEmpty()) {
            throw new AccessDeniedException("Bạn chưa được phân công dịch vụ này.");
        }
        BookingStatus next = complete ? BookingStatus.COMPLETED : BookingStatus.IN_PROGRESS;
        if (item.getStatus() == next) return;
        if (complete) {
            if (item.getStatus() != BookingStatus.IN_PROGRESS) throw new ConflictException("Dịch vụ chưa bắt đầu.");
            item.setCompletedAt(Instant.now());
        } else {
            if (item.getStatus() != BookingStatus.CONFIRMED || item.getCheckedInAt() == null) {
                throw new ConflictException("Lễ tân cần xác nhận khách đã đến trước khi bắt đầu.");
            }
            TimeSlot slot = timeSlotRepository.findById(item.getTimeSlotId())
                    .orElseThrow(() -> new ResourceNotFoundException("Time slot", item.getTimeSlotId()));
            if (slot.getStartTime().isAfter(Instant.now())) throw new BusinessException("Chưa đến giờ hẹn.");
            item.setStartedAt(Instant.now());
        }
        item.setStatus(next);
        BookingStatus from = booking.getStatus();
        if (from == next || (complete && items.stream().anyMatch(i -> i.getStatus() != BookingStatus.COMPLETED))) return;
        booking.setStatus(next);
        historyRepository.save(new BookingStatusHistory(id, from, next, userId, null));
        if (complete) syncCompletedBookingLoyalty(booking);
        recordEvent(toResponses(List.of(booking)).getFirst(), routingKeyFor(next), null);
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
        if (to == BookingStatus.IN_PROGRESS || to == BookingStatus.COMPLETED) {
            if (items.stream().anyMatch(i -> i.getStaffId() == null)) {
                throw new ConflictException("Cần phân công trước khi bắt đầu dịch vụ.");
            }
            boolean vet = SecurityUtils.hasRole("VETERINARIAN") && !SecurityUtils.hasAnyRole("OWNER", "ADMIN");
            if (vet || items.stream().anyMatch(i -> i.getCheckedInAt() != null)) {
                if (items.size() != 1) throw new ConflictException("Vui lòng cập nhật từng dịch vụ trong lịch khám.");
                attend(userId, id, items.getFirst().getId(), to == BookingStatus.COMPLETED);
                return toResponses(List.of(booking)).getFirst();
            }
        }
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
            if (from == BookingStatus.IN_PROGRESS && !SecurityUtils.hasRole("ADMIN")) {
                throw new AccessDeniedException("Access denied");
            }
            if (!clinic && !BookingCancellationPolicy.canCustomerCancel(earliest, Instant.now())) {
                throw new BusinessException("Cancellation is only allowed at least 30 minutes before the appointment");
            }
        }

        booking.setStatus(to);
        items.forEach(i -> i.setStatus(to));
        if (to == BookingStatus.COMPLETED || from == BookingStatus.COMPLETED) syncCompletedBookingLoyalty(booking);
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

    private void syncCompletedBookingLoyalty(Booking booking) {
        if (booking.getStatus() == BookingStatus.COMPLETED && booking.getPaymentStatus() == PaymentStatus.PAID) {
            bookingRepository.flush();
            loyaltyService.getOrCreateAccount(booking.getCustomerId());
        }
    }
    

    // ─── Hàm phụ ───────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<BookingResponse> forShift(UUID shiftId) {
        return toResponses(bookingRepository.findAllById(itemRepository.openBookingIdsForShift(shiftId,
                Set.of(BookingStatus.PENDING, BookingStatus.CONFIRMED))));
    }

    private record MoveContext(BookingItem item, Set<UUID> held, int minutes,
                               UUID branchId, List<TimeSlot> otherSlots) {}

    private MoveContext prepareMove(Booking booking, UUID userId, UUID itemId) {
        boolean operator = isClinicSide() && SecurityUtils.hasPermission("booking:update");
        if (!operator && !booking.getCustomerId().equals(userId)) {
            throw new ResourceNotFoundException("Booking", booking.getId());
        }
        if (!Set.of(BookingStatus.PENDING, BookingStatus.CONFIRMED).contains(booking.getStatus())) {
            throw new ConflictException("Chỉ có thể đổi lịch đang chờ hoặc đã xác nhận.");
        }
        List<BookingItem> items = itemRepository.findByBookingId(booking.getId());
        BookingItem item = items.stream().filter(i -> i.getId().equals(itemId)).findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Booking item", itemId));
        if (item.getCheckedInAt() != null) throw new ConflictException("Dịch vụ đã được tiếp đón.");
        Set<UUID> held = Set.copyOf(reservedSlots(item));
        List<TimeSlot> original = timeSlotRepository.findAllById(held);
        Instant start = original.stream().map(TimeSlot::getStartTime).min(Instant::compareTo)
                .orElseThrow(() -> new BusinessException("Lịch hẹn thiếu khung giờ gốc."));
        Instant now = Instant.now();
        if (!start.isAfter(now)) throw new BusinessException("Dịch vụ này đã đến giờ hẹn.");
        if (!operator && !BookingCancellationPolicy.canCustomerCancel(start, now)) {
            throw new BusinessException("Vui lòng liên hệ lễ tân để đổi lịch trong vòng 30 phút trước buổi hẹn.");
        }
        int minutes = Math.toIntExact(original.stream()
                .mapToLong(s -> Duration.between(s.getStartTime(), s.getEndTime()).toMinutes()).sum());
        List<UUID> otherIds = items.stream().filter(i -> !i.getId().equals(itemId))
                .flatMap(i -> reservedSlots(i).stream()).toList();
        UUID branchId = booking.getBranchId();
        if (branchId == null) branchId = reservedBranch(original.getFirst());
        return new MoveContext(item, held, minutes, branchId, timeSlotRepository.findAllById(otherIds));
    }

    private AvailableSlotsResponse choices(MoveContext move, LocalDate date, UUID staffId) {
        var result = scheduleService.availableSlots(date, staffId, move.branchId(), move.item().getServiceId(),
                false, move.minutes(), move.held());
        List<StaffSlots> staff = new ArrayList<>();
        for (StaffSlots group : result.staff()) {
            var slots = group.slots().stream().filter(slot -> !slot.slotId().equals(move.item().getTimeSlotId()))
                    .filter(slot -> move.otherSlots().stream().noneMatch(other ->
                            slot.startTime().toInstant().isBefore(other.getEndTime())
                            && slot.endTime().toInstant().isAfter(other.getStartTime()))).toList();
            if (!slots.isEmpty()) staff.add(new StaffSlots(group.staffId(), group.scheduleId(), group.staffName(),
                    group.branchId(), group.branchName(), group.workStart(), group.workEnd(), slots));
        }
        return new AvailableSlotsResponse(date, result.timezone(), staff);
    }

    @Transactional(readOnly = true)
    public AvailableSlotsResponse moveOptions(UUID userId, UUID id, UUID itemId, LocalDate date) {
        Booking booking = bookingRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Booking", id));
        return choices(prepareMove(booking, userId, itemId), date, null);
    }

    @Transactional
    public BookingResponse reschedule(UUID userId, UUID id, UUID itemId, UUID expectedSlotId, UUID targetId) {
        Booking booking = bookingRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Booking", id));
        MoveContext move = prepareMove(booking, userId, itemId);
        BookingItem item = move.item();
        if (!expectedSlotId.equals(item.getTimeSlotId())) {
            throw new ConflictException("Lịch hẹn đã thay đổi. Vui lòng tải lại lịch hẹn.");
        }
        TimeSlot target = timeSlotRepository.findById(targetId)
                .orElseThrow(() -> new ResourceNotFoundException("Time slot", targetId));
        if (target.getScheduleId() == null) throw new BusinessException("Khung giờ chưa được phân ca.");
        Schedule shift = scheduleRepository.lockForBooking(target.getScheduleId())
                .orElseThrow(() -> new ResourceNotFoundException("Schedule", target.getScheduleId()));
        boolean offered = choices(move, shift.getWorkDate(), shift.getStaffId()).staff().stream()
                .flatMap(group -> group.slots().stream()).anyMatch(slot -> slot.slotId().equals(targetId));
        if (!offered) throw new ConflictException("Khung giờ này không còn khả dụng.");

        List<UUID> next = SlotWindow.covering(
                timeSlotRepository.findByScheduleIdInOrderByStartTimeAsc(List.of(shift.getId())), target,
                move.minutes()).stream().map(TimeSlot::getId).toList();
        replaceWindow(item, move.held(), next, targetId);
        if (!isClinicSide()) {
            item.setStaffId(null);
            item.setPreferredStaffId(shift.getStaffId());
        } else if (item.getStaffId() != null) {
            boolean needsConsent = item.getPreferredStaffId() != null && !item.getStaffId().equals(shift.getStaffId())
                    && !item.getPreferredStaffId().equals(shift.getStaffId());
            item.setStaffId(needsConsent ? null : shift.getStaffId());
        }
        BookingStatus previousStatus = booking.getStatus();
        if (!isClinicSide() && previousStatus == BookingStatus.CONFIRMED) {
            booking.setStatus(BookingStatus.PENDING);
            itemRepository.findByBookingId(id).forEach(bookingItem -> bookingItem.setStatus(BookingStatus.PENDING));
        }
        historyRepository.save(new BookingStatusHistory(id, previousStatus, booking.getStatus(), userId,
                "Reschedule " + itemId + ": " + expectedSlotId + " -> " + targetId));
        BookingResponse response = toResponses(List.of(booking)).getFirst();
        itemEvent(booking, response, itemId, "booking.rescheduled", null);
        return response;
    }

    private void replaceWindow(BookingItem item, Set<UUID> old, List<UUID> next, UUID targetId) {
        next.stream().filter(slot -> !old.contains(slot)).sorted().forEach(slot -> {
            if (timeSlotRepository.markBooked(slot) == 0) throw new ConflictException("Khung giờ vừa có người đặt.");
        });
        List<UUID> release = old.stream().filter(slot -> !next.contains(slot)).toList();
        if (!release.isEmpty()) timeSlotRepository.release(release);
        item.setTimeSlotId(targetId);
        item.getReservedSlotIds().clear();
        item.getReservedSlotIds().addAll(next);
    }

    private void itemEvent(Booking booking, BookingResponse response, UUID itemId, String type, String reason) {
        ItemResponse changed = response.items().stream().filter(i -> i.id().equals(itemId)).findFirst().orElseThrow();
        outboxService.append("Booking", booking.getId(), RabbitMQQueues.BOOKING_EXCHANGE, type,
                new BookingEventData(booking.getId(), booking.getCustomerId(), booking.getPetId(), response.status(),
                        response.totalAmount(), changed.startTime(), List.of(changed.serviceName()), reason));
    }

    private UUID reservedBranch(TimeSlot slot) {
        return scheduleRepository.findById(slot.getScheduleId()).flatMap(s -> staffRepository.findById(s.getStaffId()))
                .map(Staff::getBranchId).orElse(null);
    }

    private record Window(UUID slotId, UUID scheduleId, UUID staffId, String name, List<UUID> ids) {}
    public record WorkerOption(UUID slotId, UUID staffId, String name) {}

    private List<Window> windowsAt(TimeSlot first, UUID branch, UUID serviceId, int minutes, Set<UUID> held) {
        var candidates = timeSlotRepository.candidates(first.getStartTime(), serviceId).stream()
                .filter(c -> Objects.equals(branch, c.getBranchId())).toList();
        if (candidates.isEmpty()) return List.of();
        var ordered = timeSlotRepository.findByScheduleIdInOrderByStartTimeAsc(
                candidates.stream().map(c -> c.getScheduleId()).distinct().toList()).stream()
                .collect(Collectors.groupingBy(TimeSlot::getScheduleId));
        List<Window> result = new ArrayList<>();
        for (var c : candidates) {
            var slots = ordered.get(c.getScheduleId());
            var start = slots.stream().filter(t -> t.getId().equals(c.getSlotId())).findFirst().orElseThrow();
            var window = SlotWindow.covering(slots, start, minutes);
            if (!window.isEmpty() && window.stream().noneMatch(t -> t.isBooked() && !held.contains(t.getId()))) {
                result.add(new Window(c.getSlotId(), c.getScheduleId(), c.getStaffId(), c.getStaffName(),
                        window.stream().map(TimeSlot::getId).toList()));
            }
        }
        return result;
    }

    private List<Window> assignmentWindows(Booking booking, BookingItem item) {
        if (item.getStaffId() != null || !Set.of(BookingStatus.PENDING, BookingStatus.CONFIRMED).contains(item.getStatus())) {
            throw new ConflictException("Dịch vụ này không còn chờ phân công.");
        }
        if (item.getTimeSlotId() == null) throw new BusinessException("Dịch vụ chưa có khung giờ để phân công.");
        var start = timeSlotRepository.findById(item.getTimeSlotId()).orElseThrow();
        if (start.getStartTime().atZone(ZONE).toLocalDate().isBefore(LocalDate.now(ZONE))) {
            throw new BusinessException("Ngày hẹn đã qua.");
        }
        var held = reservedSlots(item);
        int minutes = Math.toIntExact(timeSlotRepository.findAllById(held).stream()
                .mapToLong(t -> Duration.between(t.getStartTime(), t.getEndTime()).toMinutes()).sum());
        UUID branch = booking.getBranchId() == null ? reservedBranch(start) : booking.getBranchId();
        return windowsAt(start, branch, item.getServiceId(), minutes, held);
    }

    @Transactional(readOnly = true)
    public List<WorkerOption> assignmentOptions(UUID id, UUID itemId) {
        Booking booking = bookingRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Booking", id));
        BookingItem item = visitItem(itemRepository.findByBookingId(id), itemId);
        return assignmentWindows(booking, item).stream().map(w -> new WorkerOption(w.slotId(), w.staffId(), w.name())).toList();
    }

    @Transactional
    public BookingResponse assign(UUID userId, UUID id, UUID itemId, UUID expected, UUID target, boolean customerAgreed) {
        Booking booking = lockVisit(id);
        List<BookingItem> items = itemRepository.findByBookingId(id);
        BookingItem item = visitItem(items, itemId);
        if (!expected.equals(item.getTimeSlotId())) throw new ConflictException("Lịch hẹn đã thay đổi.");
        var available = assignmentWindows(booking, item);
        var window = available.stream().filter(w -> w.slotId().equals(target)).findFirst()
                .orElseThrow(() -> new ConflictException("Nhân viên không còn trống vào giờ hẹn."));
        if (!window.staffId().equals(item.getPreferredStaffId()) && !customerAgreed
                && available.stream().anyMatch(w -> w.staffId().equals(item.getPreferredStaffId()))) {
            throw new BusinessException("Cần trao đổi và có sự đồng ý của khách trước khi đổi người phụ trách.");
        }
        if (!scheduleRepository.lockForBooking(window.scheduleId()).orElseThrow().isAvailable()) {
            throw new ConflictException("Ca làm đã đóng.");
        }
        replaceWindow(item, Set.copyOf(reservedSlots(item)), window.ids(), target);
        item.setStaffId(window.staffId());
        historyRepository.save(new BookingStatusHistory(id, booking.getStatus(), booking.getStatus(), userId,
                "Assigned " + itemId + " to " + window.staffId() + (customerAgreed ? " (customer agreed)" : "")));
        if (booking.getStatus() == BookingStatus.PENDING && items.stream().allMatch(i -> i.getStaffId() != null)) {
            transition(userId, id, BookingStatus.CONFIRMED, null);
        }
        var response = toResponses(List.of(booking)).getFirst();
        itemEvent(booking, response, itemId, "booking.assigned", window.name());
        return response;
    }

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
        var customers = userRepository.findAllById(bookings.stream().map(Booking::getCustomerId).distinct().toList())
                .stream().collect(Collectors.toMap(com.petcare.platform.user.domain.User::getId,
                        com.petcare.platform.user.domain.User::getFullName));
        var pets = petRepository.findAllById(bookings.stream().map(Booking::getPetId).distinct().toList())
                .stream().collect(Collectors.toMap(Pet::getId, Pet::getName));

        var personIds = all.stream().flatMap(i -> java.util.stream.Stream.of(i.getStaffId(), i.getPreferredStaffId()))
                .filter(Objects::nonNull).distinct().toList();
        Map<UUID, String> names = personIds.isEmpty() ? Map.of() : staffRepository.directoryById(personIds).stream()
                .collect(Collectors.toMap(StaffRepository.DirectoryEntry::getId, StaffRepository.DirectoryEntry::getFullName));

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
                                i.getStaffId(), i.getStaffId() == null ? null : names.get(i.getStaffId()),
                                i.getPreferredStaffId(), i.getPreferredStaffId() == null ? null : names.get(i.getPreferredStaffId()),
                                slot == null ? null : slot.getScheduleId(), i.getTimeSlotId(),
                                slot == null ? null : slot.getStartTime().atZone(ZONE).toOffsetDateTime(),
                                endTime == null ? null : endTime.atZone(ZONE).toOffsetDateTime(),
                                i.getStatus().name(), i.getCheckedInAt(), i.getUnitPrice(), i.getNotes());
                    }).toList();
            Promotion promotion = b.getPromotionId() == null ? null : promotions.get(b.getPromotionId());
            return new BookingResponse(b.getId(), b.getCustomerId(), customers.get(b.getCustomerId()),
                    b.getPetId(), pets.get(b.getPetId()), b.getBranchId(),
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
