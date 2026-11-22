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

    @Query(value = "select 1 from pg_advisory_xact_lock(hashtextextended(:target,0))", nativeQuery = true)
    int lockPayable(@Param("target") String target);

    Optional<Order> findByOrderCode(String orderCode);

    Optional<Order> findFirstByBookingIdAndStatusInOrderByCreatedAtDesc(
            UUID bookingId, java.util.List<OrderStatus> statuses);

    Optional<Order> findFirstByInvoiceIdAndStatusInOrderByCreatedAtDesc(
            UUID invoiceId, java.util.List<OrderStatus> statuses);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from Order o where o.orderCode = :orderCode")
    Optional<Order> findByOrderCodeForUpdate(@Param("orderCode") String orderCode);

    @Query(value = "select nextval('order_code_seq')", nativeQuery = true)
    long nextOrderCodeSequence();
}
