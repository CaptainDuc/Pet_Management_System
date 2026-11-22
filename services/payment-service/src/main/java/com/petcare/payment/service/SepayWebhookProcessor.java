package com.petcare.payment.service;

import com.petcare.payment.domain.Order;
import com.petcare.payment.domain.OrderStatus;
import com.petcare.payment.domain.PaymentTransaction;
import com.petcare.payment.dto.SepayWebhookPayload;
import com.petcare.payment.outbox.PaymentEventOutbox;
import com.petcare.payment.repository.OrderRepository;
import com.petcare.payment.repository.PaymentTransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Applies a SePay callback and stores the reconciliation record in one ACID
 * transaction. Runs in its own bean so a unique-constraint race rolls back only
 * this unit of work and the caller can answer "duplicate" instead of 500.
 */
@Service
@RequiredArgsConstructor
public class SepayWebhookProcessor {

    private final OrderRepository orderRepository;
    private final PaymentTransactionRepository transactionRepository;
    private final PaymentEventOutbox eventOutbox;

    @Transactional
    public ProcessingResult process(SepayWebhookPayload payload, String orderCode, String rawPayload) {
        Order order = orderCode == null
                ? null
                : orderRepository.findByOrderCodeForUpdate(orderCode).orElse(null);

        boolean becamePaid = false;
        if (order != null && (order.getStatus() == OrderStatus.PENDING || order.getStatus() == OrderStatus.PARTIALLY_PAID)) {
            BigDecimal received = transactionRepository.received(order.getId()).add(payload.transferAmount());
            if (received.compareTo(order.getTotalAmount()) >= 0) {
                order.setStatus(OrderStatus.PAID);
                order.setPaidAt(Instant.now());
                becamePaid = true;
            } else {
                order.setStatus(OrderStatus.PARTIALLY_PAID);
            }
            orderRepository.save(order);
        }

        if (becamePaid) {
            Map<String, Object> data = new LinkedHashMap<>();
            data.put("bookingId", order.getBookingId());
            data.put("invoiceId", order.getInvoiceId());
            data.put("orderCode", order.getOrderCode());
            data.put("reference", order.getInvoiceCode());
            data.put("amount", order.getTotalAmount());
            data.put("paidAt", order.getPaidAt());
            eventOutbox.append(order.getId(), "payment.completed",
                    "petcare.payment", "payment.completed", data);
        }

        PaymentTransaction transaction = PaymentTransaction.builder()
                .orderId(order != null ? order.getId() : null)
                .transactionType("PAYMENT")
                .provider("SEPAY")
                .providerTransactionId(String.valueOf(payload.id()))
                .idempotencyKey("sepay-" + payload.id())
                .amount(payload.transferAmount())
                .status("SUCCESS")
                .processedAt(Instant.now())
                .sepayTransactionId(payload.id())
                .amountIn(payload.transferAmount())
                .content(payload.content())
                .rawPayload(rawPayload)
                .build();
        transactionRepository.save(transaction);

        String status = order != null ? order.getStatus().name() : OrderStatus.UNMATCHED.name();
        return new ProcessingResult(status, order != null ? order.getOrderCode() : null);
    }

    public record ProcessingResult(String status, String orderCode) {
    }
}
