package com.petcare.platform.medical.service;

import com.petcare.platform.booking.domain.BookingStatus;
import com.petcare.platform.booking.repository.BookingItemRepository;
import com.petcare.platform.common.exception.ResourceNotFoundException;
import com.petcare.platform.common.security.SecurityUtils;
import com.petcare.platform.pet.domain.Pet;
import com.petcare.platform.pet.repository.PetRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MedicalAccessService {

    // Bác sĩ chỉ xem hồ sơ khi lịch hẹn đã được xác nhận trở đi
    private static final List<BookingStatus> VET_VISIBLE = List.of(
            BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS, BookingStatus.COMPLETED);

    private final PetRepository petRepository;
    private final BookingItemRepository bookingItemRepository;

    @Transactional(readOnly = true)
    public void requireRead(UUID userId, UUID petId) {
        Pet pet = petRepository.findByIdAndActiveTrue(petId)
                .orElseThrow(() -> new ResourceNotFoundException("Pet", petId));

        if (SecurityUtils.hasAnyRole("ADMIN", "OWNER")) {
            return;
        }
        if (pet.getOwnerId().equals(userId)) {
            return;
        }
        if (SecurityUtils.hasRole("VETERINARIAN")
                && bookingItemRepository.existsAssignedAccess(userId, petId, VET_VISIBLE)) {
            return;
        }
        throw new ResourceNotFoundException("Pet", petId);
    }
}