package com.petcare.payment.repository;

import com.petcare.payment.domain.Order;
import com.petcare.payment.domain.OrderStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface OrderRepository extends JpaRepository<Order, UUID> {

    Optional<Order> findByOrderCode(String orderCode);

    Optional<Order> findFirstByBookingIdAndStatusOrderByCreatedAtDesc(
            UUID bookingId, OrderStatus status);

    Optional<Order> findFirstByInvoiceIdAndStatusOrderByCreatedAtDesc(
            UUID invoiceId, OrderStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from Order o where o.orderCode = :orderCode")
    Optional<Order> findByOrderCodeForUpdate(@Param("orderCode") String orderCode);

    @Query(value = "select nextval('order_code_seq')", nativeQuery = true)
    long nextOrderCodeSequence();
}
