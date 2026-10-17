package com.petcare.platform.invoice.repository;

import com.petcare.platform.invoice.domain.InvoiceItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface InvoiceItemRepository extends JpaRepository<InvoiceItem, UUID> {

    List<InvoiceItem> findByInvoiceIdOrderByCreatedAtAsc(UUID invoiceId);
}