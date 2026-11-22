package com.petcare.payment;

import com.petcare.payment.domain.Order;
import com.petcare.payment.domain.OrderStatus;
import com.petcare.payment.dto.SepayWebhookPayload;
import com.petcare.payment.outbox.PaymentEventOutbox;
import com.petcare.payment.repository.OrderRepository;
import com.petcare.payment.repository.PaymentTransactionRepository;
import com.petcare.payment.service.SepayWebhookProcessor;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;
import java.util.Map;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.assertThat;

class TransferBalanceTest {
    @Test void secondInstallmentCompletesOrderWithFullPayableAmount() {
        var orders = mock(OrderRepository.class);
        var ledger = mock(PaymentTransactionRepository.class);
        var events = mock(PaymentEventOutbox.class);
        var order = Order.builder().id(UUID.randomUUID()).orderCode("DH123")
                .totalAmount(new BigDecimal("500000")).status(OrderStatus.PARTIALLY_PAID).build();
        when(orders.findByOrderCodeForUpdate("DH123")).thenReturn(Optional.of(order));
        when(ledger.received(order.getId())).thenReturn(new BigDecimal("300000"));
        var transfer = new SepayWebhookPayload(42L,null,null,null,null,null,"DH123","in",
                new BigDecimal("200000"),null,null,null);
        new SepayWebhookProcessor(orders, ledger, events).process(transfer,"DH123","{}");
        assertThat(order.getStatus()).isEqualTo(OrderStatus.PAID);
        verify(events).append(eq(order.getId()),eq("payment.completed"),eq("petcare.payment"),
                eq("payment.completed"),argThat(data -> order.getTotalAmount().equals(((Map<?,?>)data).get("amount"))));
    }
}
