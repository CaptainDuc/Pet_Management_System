package com.petcare.payment.repository;

import com.petcare.payment.domain.PaymentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, UUID> {

    @org.springframework.data.jpa.repository.Query("select coalesce(sum(t.amountIn),0) from PaymentTransaction t where t.orderId = :id")
    java.math.BigDecimal received(@org.springframework.data.repository.query.Param("id") UUID id);

    boolean existsBySepayTransactionId(Long sepayTransactionId);
}
