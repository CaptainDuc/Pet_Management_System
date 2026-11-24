package com.petcare.platform.booking.repository;

import com.petcare.platform.booking.domain.BookingItem;
import com.petcare.platform.booking.domain.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface BookingItemRepository extends JpaRepository<BookingItem, UUID> {

    @Query("""
            select distinct i.bookingId from BookingItem i join TimeSlot t on t.id = i.timeSlotId
            where t.scheduleId = :shiftId and i.status in :statuses
            """)
    List<UUID> openBookingIdsForShift(UUID shiftId, Collection<BookingStatus> statuses);

    List<BookingItem> findByBookingId(UUID bookingId);

    List<BookingItem> findByBookingIdIn(Collection<UUID> bookingIds);

    // Bác sĩ (theo userId) có lịch hẹn được giao cho thú cưng này, ở các trạng thái cho phép xem hồ sơ
    @Query("""
            select count(i) > 0
            from BookingItem i, Booking b, Staff s
            where i.bookingId = b.id
              and i.staffId = s.id
              and s.userId = :userId
              and b.petId = :petId
              and i.status in :statuses
            """)
    boolean existsAssignedAccess(@Param("userId") UUID userId,
                                 @Param("petId") UUID petId,
                                 @Param("statuses") Collection<BookingStatus> statuses);
}
