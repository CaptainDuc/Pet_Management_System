package com.petcare.platform.pet.service;

import com.petcare.platform.common.exception.ResourceNotFoundException;
import com.petcare.platform.common.security.SecurityUtils;
import com.petcare.platform.pet.domain.Pet;
import com.petcare.platform.pet.dto.CreatePetRequest;
import com.petcare.platform.pet.dto.PetResponse;
import com.petcare.platform.pet.repository.PetRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PetService {

    private final PetRepository petRepository;

    @Transactional
    public PetResponse create(UUID ownerId, CreatePetRequest request) {
        Pet pet = new Pet();
        pet.setOwnerId(ownerId);
        apply(pet, request);
        return toResponse(petRepository.save(pet));
    }

    @Transactional(readOnly = true)
    public Page<PetResponse> list(UUID userId, String search, Pageable pageable) {
        boolean hasSearch = search != null && !search.isBlank();
        String keyword = hasSearch ? search.trim() : null;

        Page<Pet> page;
        if (isClinicSide()) {
            page = hasSearch
                    ? petRepository.findByActiveTrueAndNameContainingIgnoreCase(keyword, pageable)
                    : petRepository.findByActiveTrue(pageable);
        } else {
            page = hasSearch
                    ? petRepository.findByOwnerIdAndActiveTrueAndNameContainingIgnoreCase(userId, keyword, pageable)
                    : petRepository.findByOwnerIdAndActiveTrue(userId, pageable);
        }
        return page.map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public PetResponse get(UUID userId, UUID id) {
        return toResponse(findAccessible(userId, id));
    }

    @Transactional
    public PetResponse update(UUID userId, UUID id, CreatePetRequest request) {
        Pet pet = findAccessible(userId, id);
        apply(pet, request);
        return toResponse(petRepository.save(pet));
    }

    @Transactional
    public void delete(UUID userId, UUID id) {
        Pet pet = findAccessible(userId, id);
        pet.setActive(false);
        petRepository.save(pet);
    }

    // Khách hàng chỉ truy cập thú cưng của mình; không phải của mình thì báo "không tìm thấy"
    private Pet findAccessible(UUID userId, UUID id) {
        Pet pet = petRepository.findByIdAndActiveTrue(id)
                .orElseThrow(() -> new ResourceNotFoundException("Pet", id));
        if (!isClinicSide() && !pet.getOwnerId().equals(userId)) {
            throw new ResourceNotFoundException("Pet", id);
        }
        return pet;
    }

    private boolean isClinicSide() {
        return SecurityUtils.hasAnyRole("ADMIN", "OWNER", "STAFF", "VETERINARIAN");
    }

    private void apply(Pet pet, CreatePetRequest r) {
        pet.setName(r.name().trim());
        pet.setSpecies(r.species().trim());
        pet.setBreedId(r.breedId());
        pet.setGender(r.gender());
        pet.setDateOfBirth(r.dateOfBirth());
        pet.setWeight(r.weight());
        pet.setPhotoUrl(r.photoUrl());
        pet.setNotes(r.notes());
    }

    private PetResponse toResponse(Pet p) {
        return new PetResponse(p.getId(), p.getOwnerId(), p.getBreedId(),
                p.getName(), p.getSpecies(), p.getGender(),
                p.getDateOfBirth(), p.getWeight(),
                p.getPhotoUrl(), p.getNotes(),
                p.isActive(), p.getCreatedAt());
    }
}