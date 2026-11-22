package com.petcare.payment.service;

import com.petcare.payment.client.PayableClient;
import com.petcare.payment.client.PayableInfo;
import com.petcare.payment.config.SepayProperties;
import com.petcare.payment.domain.Order;
import com.petcare.payment.domain.OrderStatus;
import com.petcare.payment.dto.CreatePaymentRequest;
import com.petcare.payment.dto.CreatePaymentResponse;
import com.petcare.payment.dto.OrderStatusResponse;
import com.petcare.payment.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final SepayProperties properties;
    private final PayableClient payableClient;
    private final com.petcare.payment.repository.PaymentTransactionRepository transactions;

    @Transactional
    public CreatePaymentResponse create(CreatePaymentRequest request, String authorization) {
        if (request.invoiceId() != null && request.bookingId() != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Select a booking or invoice");
        }
        payableClient.requireAccess(request.bookingId(), request.invoiceId(), authorization);
        PayableInfo payable = request.invoiceId() == null
                ? payableClient.booking(request.bookingId()) : payableClient.invoice(request.invoiceId());
        ensureUnpaid(payable);
        BigDecimal amount = payable.amount();
        if (amount == null || amount.signum() <= 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "No payable balance");
        }
        UUID bookingId = payable.bookingId();
        UUID target = bookingId == null ? request.invoiceId() : bookingId;
        orderRepository.lockPayable(target.toString());
        var open = java.util.List.of(OrderStatus.PENDING, OrderStatus.PARTIALLY_PAID, OrderStatus.PAID);
        Optional<Order> existing = bookingId == null ? Optional.empty()
                : orderRepository.findFirstByBookingIdAndStatusInOrderByCreatedAtDesc(bookingId, open);
        if (existing.isEmpty() && request.invoiceId() != null) {
            existing = orderRepository.findFirstByInvoiceIdAndStatusInOrderByCreatedAtDesc(request.invoiceId(), open);
        }
        if (existing.isPresent()) {
            Order order = existing.get();
            if (order.getStatus() == OrderStatus.PAID || !sameAmount(order.getTotalAmount(), amount)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Payment requires reconciliation");
            }
            return toCreateResponse(order);
        }
        String reference = payable.reference();
        String description = request.description();

        String orderCode = properties.paymentPrefix() + orderRepository.nextOrderCodeSequence();
        Instant now = Instant.now();

        Order order = Order.builder()
                .orderCode(orderCode)
                .bookingId(bookingId)
                .invoiceId(request.invoiceId())
                .invoiceCode(reference)
                .description(description)
                .totalAmount(amount)
                .status(OrderStatus.PENDING)
                .createdAt(now)
                .updatedAt(now)
                .build();

        return toCreateResponse(orderRepository.save(order));
    }

    @Transactional(readOnly = true)
    public OrderStatusResponse getStatus(String orderCode, String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Login required");
        }
        Order order = orderRepository.findByOrderCode(orderCode)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Order not found: " + orderCode));

        String targetStatus = payableClient.requireAccess(order.getBookingId(),
                order.getBookingId() == null ? order.getInvoiceId() : null, authorization);
        if ("CANCELLED".equals(targetStatus)) {
            boolean fundsReceived = transactions.received(order.getId()).signum() > 0;
            return new OrderStatusResponse(orderCode, fundsReceived ? "REFUND_REVIEW" : "CANCELLED",
                    order.getTotalAmount(), BigDecimal.ZERO, null, order.getPaidAt());
        }
        BigDecimal remaining = remainingAmount(order);
        return new OrderStatusResponse(order.getOrderCode(), order.getStatus().name(),
                order.getTotalAmount(), remaining, buildQrUrl(order, remaining), order.getPaidAt());
    }

    private BigDecimal remainingAmount(Order order) {
        return order.getTotalAmount().subtract(transactions.received(order.getId())).max(BigDecimal.ZERO);
    }

    private String buildQrUrl(Order order, BigDecimal remaining) {
        return UriComponentsBuilder.fromHttpUrl(properties.qrBaseUrl())
                .queryParam("acc", properties.bankAccountNumber())
                .queryParam("bank", properties.bankCode())
                .queryParam("amount", remaining.toPlainString())
                .queryParam("des", order.getOrderCode())
                .build()
                .toUriString();
    }

    private void ensureUnpaid(PayableInfo payable) {
        if (payable.alreadyPaid()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Payable is already paid");
        }
    }

    private boolean sameAmount(BigDecimal left, BigDecimal right) {
        return left != null && right != null && left.compareTo(right) == 0;
    }

    private CreatePaymentResponse toCreateResponse(Order order) {
        CreatePaymentResponse.BankInfo bankInfo = new CreatePaymentResponse.BankInfo(
                properties.bankCode(),
                properties.bankAccountNumber(),
                properties.bankAccountName());

        BigDecimal remaining = remainingAmount(order);
        return new CreatePaymentResponse(order.getOrderCode(), order.getBookingId(),
                order.getInvoiceId(), remaining, order.getStatus().name(),
                bankInfo, buildQrUrl(order, remaining), order.getCreatedAt());
    }
}
