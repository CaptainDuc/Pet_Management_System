package com.petcare.platform.booking.repository;

import com.petcare.platform.booking.domain.BookingItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface BookingItemRepository extends JpaRepository<BookingItem, UUID> {

    List<BookingItem> findByBookingId(UUID bookingId);

    List<BookingItem> findByBookingIdIn(Collection<UUID> bookingIds);
}