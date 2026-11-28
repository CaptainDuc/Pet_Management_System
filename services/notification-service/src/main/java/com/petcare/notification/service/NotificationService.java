package com.petcare.notification.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.petcare.notification.domain.Notification;
import com.petcare.notification.dto.NotificationPage;
import com.petcare.notification.dto.NotificationResponse;
import com.petcare.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.AmqpRejectAndDontRequeueException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm 'ngày' dd/MM/yyyy");

    private final NotificationRepository repository;
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    // ─── Xử lý sự kiện từ RabbitMQ ─────────────────────────────────────────

    @Transactional
    @SuppressWarnings("unchecked")
    public void handleBookingEvent(Map<String, Object> envelope) {
        Object eventIdRaw = envelope.get("eventId");
        Object eventTypeRaw = envelope.get("eventType");
        Object dataRaw = envelope.get("data");
        if (eventIdRaw == null || eventTypeRaw == null || !(dataRaw instanceof Map)) {
            throw new AmqpRejectAndDontRequeueException("Malformed booking event");
        }

        UUID eventId = UUID.fromString(eventIdRaw.toString());
        String eventType = eventTypeRaw.toString();
        Map<String, Object> data = (Map<String, Object>) dataRaw;

        // Inbox: chèn mã sự kiện trước, nếu đã có thì đây là tin gửi lặp, bỏ qua
        int inserted = jdbcTemplate.update(
                "INSERT INTO inbox_events (event_id, event_type, payload, processed_at) "
                        + "VALUES (?, ?, ?::jsonb, NOW()) ON CONFLICT (event_id) DO NOTHING",
                eventId, eventType, toJson(envelope));
        if (inserted == 0) {
            log.info("Duplicate event {} ignored", eventId);
            return;
        }

        Object customerRaw = data.get("customerId");
        if (customerRaw == null) {
            throw new AmqpRejectAndDontRequeueException("Event without customerId");
        }

        String[] text = compose(eventType, data);
        if (text == null) {
            return; // loại sự kiện chưa cần thông báo
        }

        Notification n = new Notification();
        n.setUserId(UUID.fromString(customerRaw.toString()));
        Object bookingId = data.get("bookingId");
        if (bookingId != null) {
            n.setAppointmentId(UUID.fromString(bookingId.toString()));
            if ("booking.rescheduled".equals(eventType) || "booking.cancelled".equals(eventType)) {
                jdbcTemplate.update("""
                        update notification_deliveries set status='DEAD_LETTERED',updated_at=now(),
                        last_error='Appointment changed' where channel='EMAIL' and status in ('PENDING','FAILED')
                        and notification_id in (select id from notifications where appointment_id=?)
                        """, n.getAppointmentId());
            }
        }
        n.setType(eventType);
        n.setTitle(text[0]);
        n.setBody(text[1]);
        repository.saveAndFlush(n);
        if ("booking.reminder-24h".equals(eventType) && data.get("customerEmail") instanceof String email
                && !email.isBlank()) {
            jdbcTemplate.update("""
                    insert into notification_deliveries(notification_id,channel,recipient,provider,status,next_attempt_at)
                    values (?,'EMAIL',?,'SMTP','PENDING',now())
                    """, n.getId(), email);
        }
    }

    private String[] compose(String eventType, Map<String, Object> data) {
        String services = joinServices(data.get("serviceNames"));
        String time = formatTime(data.get("startTime"));
        String reason = data.get("reason") == null ? "" : data.get("reason").toString();

        return switch (eventType) {
            case "notification.send" -> new String[]{
                    String.valueOf(data.get("title")), String.valueOf(data.get("body"))};
            case "booking.created" -> new String[]{
                    "Đặt lịch thành công",
                    "Lịch hẹn " + services + " lúc " + time + " đã được ghi nhận và đang chờ xác nhận."};
            case "booking.assigned" -> new String[]{
                    "Đã phân công người phụ trách",
                    reason + " sẽ phụ trách " + services + " lúc " + time + "."};
            case "booking.rescheduled" -> new String[]{
                    "Lịch hẹn đã được đổi",
                    "Giờ hẹn mới cho " + services + " là " + time + "."};
            case "booking.confirmed" -> new String[]{
                    "Lịch hẹn đã được xác nhận",
                    "Phòng khám đã xác nhận lịch hẹn " + services + " lúc " + time + "."};
            case "booking.started" -> new String[]{
                    "Buổi hẹn đã bắt đầu",
                    "Lịch hẹn " + services + " của bạn đang được thực hiện."};
            case "booking.completed" -> new String[]{
                    "Lịch hẹn đã hoàn thành",
                    "Cảm ơn bạn đã sử dụng dịch vụ " + services + " của PetCare."};
            case "booking.reminder-24h" -> new String[]{
                    "Nhắc lịch hẹn sắp tới",
                    "Lịch hẹn " + services + " sẽ diễn ra lúc " + time + ". Hãy chuẩn bị cho bé nhé."};
            case "booking.reminder-30m" -> new String[]{
                    "Lịch hẹn sắp bắt đầu",
                    "Còn khoảng 30 phút nữa đến lịch hẹn " + services + " lúc " + time + ". Hãy chuẩn bị cho bé nhé."};
            case "booking.no-show" -> new String[]{
                    "Lịch hẹn được ghi nhận là vắng mặt",
                    "Phòng khám đã ghi nhận bé không đến lịch hẹn " + services + " lúc " + time + "."};
            case "booking.cancelled" -> new String[]{
                    "Lịch hẹn đã bị hủy",
                    "Lịch hẹn " + services + " lúc " + time + " đã bị hủy."
                            + (reason.isBlank() ? "" : " Lý do: " + reason)};
            case "booking.paid" -> new String[]{
                    "Thanh toán thành công",
                    "Lịch hẹn " + services + " lúc " + time + " đã được thanh toán "
                            + formatAmount(data.get("totalAmount")) + "."};
            case "booking.issue" -> new String[]{
                    "Phòng khám cần trao đổi về lịch hẹn",
                    "Về lịch hẹn " + services + " lúc " + time + ": " + reason};
            default -> null;
        };
    }

    private String joinServices(Object raw) {
        if (raw instanceof List<?> list && !list.isEmpty()) {
            return String.join(", ", list.stream().map(String::valueOf).toList());
        }
        return "của bạn";
    }

    private String formatAmount(Object raw) {
        if (raw == null) {
            return "thành công";
        }
        try {
            java.math.BigDecimal amount = new java.math.BigDecimal(raw.toString());
            return String.format("%,.0fđ", amount).replace(',', '.');
        } catch (NumberFormatException ex) {
            return raw.toString();
        }
    }

    private String formatTime(Object raw) {
        if (raw == null) {
            return "(chưa rõ giờ)";
        }
        try {
            return OffsetDateTime.parse(raw.toString()).atZoneSameInstant(ZONE).format(TIME_FORMAT);
        } catch (Exception e) {
            return raw.toString();
        }
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new AmqpRejectAndDontRequeueException("Cannot serialize event", e);
        }
    }

    // ─── API cho người dùng ────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public NotificationPage list(UUID userId, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 50));
        Page<Notification> result = repository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
        return new NotificationPage(
                result.getContent().stream().map(this::toResponse).toList(),
                result.getNumber(), result.getSize(),
                result.getTotalElements(), result.getTotalPages());
    }

    @Transactional(readOnly = true)
    public long unreadCount(UUID userId) {
        return repository.countByUserIdAndReadFalse(userId);
    }

    @Transactional(readOnly = true)
    public NotificationResponse get(UUID userId, UUID id) {
        return repository.findByIdAndUserId(id, userId)
                .map(this::toResponse)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found"));
    }
    @Transactional
    public NotificationResponse markRead(UUID userId, UUID id) {
        Notification n = repository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found"));
        if (!n.isRead()) {
            Instant now = Instant.now();
            n.setRead(true);
            n.setReadAt(now);
            n.setUpdatedAt(now);
            repository.save(n);
        }
        return toResponse(n);
    }

    @Transactional
    public int markAllRead(UUID userId) {
        return repository.markAllRead(userId, Instant.now());
    }

    private NotificationResponse toResponse(Notification n) {
        return new NotificationResponse(n.getId(), n.getType(), n.getTitle(), n.getBody(),
                n.getAppointmentId(), n.isRead(), n.getCreatedAt());
    }
}
