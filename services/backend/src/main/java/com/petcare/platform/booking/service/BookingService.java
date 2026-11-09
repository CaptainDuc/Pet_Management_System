package com.petcare.platform.booking.service;

import com.petcare.platform.booking.event.BookingEventData;
import com.petcare.platform.common.event.RabbitMQQueues;
import com.petcare.platform.common.outbox.OutboxService;
import java.time.OffsetDateTime;
import com.petcare.platform.booking.domain.Booking;
import com.petcare.platform.booking.domain.BookingItem;
import com.petcare.platform.booking.domain.BookingStatus;
import com.petcare.platform.booking.domain.BookingStatusHistory;
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
import com.petcare.platform.schedule.domain.Schedule;
import com.petcare.platform.schedule.domain.TimeSlot;
import com.petcare.platform.schedule.repository.ScheduleRepository;
import com.petcare.platform.schedule.repository.TimeSlotRepository;
import com.petcare.platform.servicecatalog.domain.CareService;
import com.petcare.platform.servicecatalog.repository.CareServiceRepository;
import com.petcare.platform.staff.domain.Staff;
import com.petcare.platform.staff.repository.StaffRepository;
import com.petcare.platform.staff.repository.StaffSkillRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
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

@Service
@RequiredArgsConstructor
public class BookingService {

    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    // Máy trạng thái (hợp đồng API, mục H.4)
    private static final Map<BookingStatus, Set<BookingStatus>> ALLOWED = Map.of(
            BookingStatus.PENDING, Set.of(BookingStatus.CONFIRMED, BookingStatus.CANCELLED),
            BookingStatus.CONFIRMED, Set.of(BookingStatus.IN_PROGRESS, BookingStatus.CANCELLED),
            BookingStatus.IN_PROGRESS, Set.of(BookingStatus.COMPLETED, BookingStatus.CANCELLED));

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

    @Value("${app.booking.cancel-cutoff-hours:2}")
    private int cancelCutoffHours;

    private record PlannedItem(CareService service, UUID slotId, UUID staffId, String notes) {}

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
            long minutes = Duration.between(slot.getStartTime(), slot.getEndTime()).toMinutes();
            if (minutes != service.getDurationMinutes()) {
                throw new BusinessException("Slot duration does not match service duration");
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
            planned.add(new PlannedItem(service, slot.getId(), staffId, item.notes()));
        }

        // 2. Giữ chỗ nguyên tử, theo thứ tự id để tránh khóa chéo giữa hai giao dịch
        planned.stream().map(PlannedItem::slotId).sorted().forEach(slotId -> {
            if (timeSlotRepository.markBooked(slotId) == 0) {
                throw new ConflictException("SLOT_ALREADY_BOOKED");
            }
        });

        // 3. Lưu lịch hẹn, giá được chụp lại từ dịch vụ
        BigDecimal total = planned.stream()
                .map(p -> p.service().getBasePrice())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Booking booking = new Booking();
        booking.setCustomerId(customerId);
        booking.setPetId(request.petId());
        booking.setBranchId(request.branchId());
        booking.setNotes(request.notes());
        booking.setTotalAmount(total);
        booking = bookingRepository.save(booking);

        for (PlannedItem p : planned) {
            BookingItem item = new BookingItem();
            item.setBookingId(booking.getId());
            item.setServiceId(p.service().getId());
            item.setStaffId(p.staffId());
            item.setTimeSlotId(p.slotId());
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
                .map(BookingItem::getTimeSlotId)
                .filter(Objects::nonNull)
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

        if (to == BookingStatus.CANCELLED && !slotIds.isEmpty()) {
            timeSlotRepository.release(slotIds);
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
                .findAllById(all.stream().map(BookingItem::getTimeSlotId)
                        .filter(Objects::nonNull).distinct().toList())
                .stream().collect(Collectors.toMap(TimeSlot::getId, t -> t));

        return bookings.stream().map(b -> {
            List<ItemResponse> itemResponses = itemsByBooking.getOrDefault(b.getId(), List.of())
                    .stream().map(i -> {
                        CareService service = services.get(i.getServiceId());
                        TimeSlot slot = i.getTimeSlotId() == null ? null : slots.get(i.getTimeSlotId());
                        return new ItemResponse(
                                i.getId(), i.getServiceId(),
                                service == null ? null : service.getName(),
                                i.getStaffId(), i.getTimeSlotId(),
                                slot == null ? null : slot.getStartTime().atZone(ZONE).toOffsetDateTime(),
                                slot == null ? null : slot.getEndTime().atZone(ZONE).toOffsetDateTime(),
                                i.getStatus().name(), i.getUnitPrice(), i.getNotes());
                    }).toList();
            return new BookingResponse(b.getId(), b.getCustomerId(), b.getPetId(), b.getBranchId(),
                    b.getPromotionId(), b.getStatus().name(), b.getTotalAmount(),
                    b.getDiscountAmount(), b.getNotes(), itemResponses,
                    b.getCreatedAt(), b.getUpdatedAt());
        }).toList();
    }
}