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

    @Transactional
    public CreatePaymentResponse create(CreatePaymentRequest request) {
        BigDecimal amount;
        String reference = request.invoiceCode();
        String description = request.description();

        if (request.bookingId() != null) {
            PayableInfo payable = payableClient.booking(request.bookingId());
            ensureUnpaid(payable);
            amount = payable.amount();
            reference = payable.reference();
            if (description == null || description.isBlank()) {
                description = "Thanh toan lich hen " + reference;
            }

            Optional<Order> existing = orderRepository
                    .findFirstByBookingIdAndStatusOrderByCreatedAtDesc(
                            request.bookingId(), OrderStatus.PENDING);
            if (existing.isPresent()) {
                Order order = existing.get();
                if (sameAmount(order.getTotalAmount(), amount)) {
                    return toCreateResponse(order);
                }
                order.setStatus(OrderStatus.CANCELLED);
                orderRepository.save(order);
            }
        } else if (request.invoiceId() != null) {
            PayableInfo payable = payableClient.invoice(request.invoiceId());
            ensureUnpaid(payable);
            amount = payable.amount();
            reference = payable.reference();
            if (description == null || description.isBlank()) {
                description = "Thanh toan hoa don " + reference;
            }

            Optional<Order> existing = orderRepository
                    .findFirstByInvoiceIdAndStatusOrderByCreatedAtDesc(
                            request.invoiceId(), OrderStatus.PENDING);
            if (existing.isPresent()) {
                Order order = existing.get();
                if (sameAmount(order.getTotalAmount(), amount)) {
                    return toCreateResponse(order);
                }
                order.setStatus(OrderStatus.CANCELLED);
                orderRepository.save(order);
            }
        } else {
            amount = request.amount();
            if (amount == null || amount.signum() <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "amount must be greater than zero");
            }
        }

        if (amount == null || amount.signum() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Payable amount must be greater than zero");
        }

        String orderCode = properties.paymentPrefix() + orderRepository.nextOrderCodeSequence();
        Instant now = Instant.now();

        Order order = Order.builder()
                .orderCode(orderCode)
                .bookingId(request.bookingId())
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
    public OrderStatusResponse getStatus(String orderCode) {
        Order order = orderRepository.findByOrderCode(orderCode)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Order not found: " + orderCode));

        return new OrderStatusResponse(order.getOrderCode(), order.getStatus().name(),
                order.getTotalAmount(), order.getPaidAt());
    }

    public String buildQrUrl(Order order) {
        return UriComponentsBuilder.fromHttpUrl(properties.qrBaseUrl())
                .queryParam("acc", properties.bankAccountNumber())
                .queryParam("bank", properties.bankCode())
                .queryParam("amount", order.getTotalAmount().toPlainString())
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

        return new CreatePaymentResponse(order.getOrderCode(), order.getBookingId(),
                order.getInvoiceId(), order.getTotalAmount(), order.getStatus().name(),
                bankInfo, buildQrUrl(order), order.getCreatedAt());
    }
}
