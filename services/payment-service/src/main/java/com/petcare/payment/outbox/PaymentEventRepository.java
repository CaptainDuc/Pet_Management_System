package com.petcare.payment.outbox;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface PaymentEventRepository extends JpaRepository<PaymentEvent, UUID> {

    @Query(value = "select * from payment_events where published_at is null "
            + "order by occurred_at limit :limit for update skip locked", nativeQuery = true)
    List<PaymentEvent> lockUnpublished(@Param("limit") int limit);
}
