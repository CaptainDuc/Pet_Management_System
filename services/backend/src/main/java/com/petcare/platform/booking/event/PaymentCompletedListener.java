package com.petcare.platform.booking.event;

import com.petcare.platform.booking.service.BookingService;
import com.petcare.platform.common.event.RabbitMQQueues;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.AmqpRejectAndDontRequeueException;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * Consumes {@code payment.completed} events produced by the payment service and
 * flips the corresponding booking to PAID. The operation is idempotent, so
 * at-least-once delivery is safe.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PaymentCompletedListener {

    private final BookingService bookingService;
    private final com.petcare.platform.invoice.repository.InvoiceRepository invoiceRepository;

    @RabbitListener(queues = RabbitMQQueues.PAYMENT_COMPLETED)
    @SuppressWarnings("unchecked")
    public void onPaymentCompleted(Map<String, Object> envelope) {
        Object dataRaw = envelope.get("data");
        if (!(dataRaw instanceof Map<?, ?> data)) {
            throw new AmqpRejectAndDontRequeueException("payment.completed without data");
        }

        Object bookingIdRaw = data.get("bookingId");
        try {
            if (bookingIdRaw == null && data.get("invoiceId") != null) {
                var invoice = invoiceRepository.findById(UUID.fromString(data.get("invoiceId").toString()));
                bookingIdRaw = invoice.orElseThrow(() ->
                        new AmqpRejectAndDontRequeueException("Unknown invoice")).getBookingId();
            }
            if (bookingIdRaw == null) return;
            UUID bookingId = UUID.fromString(bookingIdRaw.toString());
            String orderCode = data.get("orderCode") == null ? null : data.get("orderCode").toString();
            BigDecimal amount = parseAmount(data.get("amount"));
            Instant paidAt = parseInstant(data.get("paidAt"));

            boolean applied = bookingService.applyOnlinePayment(bookingId, orderCode, amount, paidAt);
            log.info("payment.completed booking={} order={} applied={}", bookingId, orderCode, applied);
        } catch (IllegalArgumentException ex) {
            throw new AmqpRejectAndDontRequeueException("Malformed payment.completed event", ex);
        }
    }

    private BigDecimal parseAmount(Object raw) {
        if (raw == null) {
            return null;
        }
        try {
            return new BigDecimal(raw.toString());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private Instant parseInstant(Object raw) {
        if (raw == null) {
            return null;
        }
        try {
            return OffsetDateTime.parse(raw.toString()).toInstant();
        } catch (Exception ex) {
            return null;
        }
    }
}
