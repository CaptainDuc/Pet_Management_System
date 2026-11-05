package com.petcare.platform.booking.repository;

import com.petcare.platform.booking.domain.BookingStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface BookingStatusHistoryRepository extends JpaRepository<BookingStatusHistory, UUID> {
}