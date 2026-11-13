package com.petcare.platform.invoice.repository;

import com.petcare.platform.invoice.domain.Invoice;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface InvoiceRepository extends JpaRepository<Invoice, UUID> {

    boolean existsByBookingId(UUID bookingId);

    Optional<Invoice> findByBookingId(UUID bookingId);

    @Query(value = "select nextval('invoice_number_seq')", nativeQuery = true)
    long nextInvoiceSequence();

    // Hóa đơn thuộc các lịch hẹn của một khách hàng
    @Query(value = "select i from Invoice i, Booking b where i.bookingId = b.id and b.customerId = :customerId",
            countQuery = "select count(i) from Invoice i, Booking b where i.bookingId = b.id and b.customerId = :customerId")
    Page<Invoice> findByCustomer(@Param("customerId") UUID customerId, Pageable pageable);
}