package com.petcare.platform.booking.repository;

import com.petcare.platform.booking.domain.Booking;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface BookingRepository
        extends JpaRepository<Booking, UUID>, JpaSpecificationExecutor<Booking> {

    // Khóa dòng khi đổi trạng thái để hai thao tác không chạy chồng nhau
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from Booking b where b.id = :id")
    Optional<Booking> findByIdForUpdate(@Param("id") UUID id);
}