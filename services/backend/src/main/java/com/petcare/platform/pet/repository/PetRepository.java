package com.petcare.platform.pet.repository;

import com.petcare.platform.pet.domain.Pet;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PetRepository extends JpaRepository<Pet, UUID> {

    Optional<Pet> findByIdAndActiveTrue(UUID id);

    List<Pet> findByOwnerIdAndActiveTrue(UUID ownerId);

    Page<Pet> findByActiveTrue(Pageable pageable);

    Page<Pet> findByActiveTrueAndNameContainingIgnoreCase(String name, Pageable pageable);

    Page<Pet> findByOwnerIdAndActiveTrue(UUID ownerId, Pageable pageable);

    Page<Pet> findByOwnerIdAndActiveTrueAndNameContainingIgnoreCase(
            UUID ownerId, String name, Pageable pageable);
}