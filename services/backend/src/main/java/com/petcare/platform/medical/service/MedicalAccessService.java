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

    // Bác sĩ xem hồ sơ từ khi lịch hẹn được xác nhận; chỉ được ghi khi đang thực hiện hoặc đã hoàn thành
    private static final List<BookingStatus> VET_READ = List.of(
            BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS, BookingStatus.COMPLETED);
    private static final List<BookingStatus> VET_WRITE = List.of(
            BookingStatus.IN_PROGRESS, BookingStatus.COMPLETED);

    private final PetRepository petRepository;
    private final BookingItemRepository bookingItemRepository;

    @Transactional(readOnly = true)
    public void requireRead(UUID userId, UUID petId) {
        Pet pet = findPet(petId);
        if (SecurityUtils.hasAnyRole("ADMIN", "OWNER")) {
            return;
        }
        if (pet.getOwnerId().equals(userId)) {
            return;
        }
        if (SecurityUtils.hasRole("VETERINARIAN")
                && bookingItemRepository.existsAssignedAccess(userId, petId, VET_READ)) {
            return;
        }
        throw new ResourceNotFoundException("Pet", petId);
    }

    @Transactional(readOnly = true)
    public void requireWrite(UUID userId, UUID petId) {
        findPet(petId);
        if (SecurityUtils.hasAnyRole("ADMIN", "OWNER")) {
            return;
        }
        if (SecurityUtils.hasRole("VETERINARIAN")
                && bookingItemRepository.existsAssignedAccess(userId, petId, VET_WRITE)) {
            return;
        }
        throw new ResourceNotFoundException("Pet", petId);
    }

    private Pet findPet(UUID petId) {
        return petRepository.findByIdAndActiveTrue(petId)
                .orElseThrow(() -> new ResourceNotFoundException("Pet", petId));
    }
}