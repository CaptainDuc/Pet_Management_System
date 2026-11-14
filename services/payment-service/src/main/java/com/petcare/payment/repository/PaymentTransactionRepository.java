package com.petcare.payment.repository;

import com.petcare.payment.domain.PaymentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, UUID> {

    boolean existsBySepayTransactionId(Long sepayTransactionId);
}
