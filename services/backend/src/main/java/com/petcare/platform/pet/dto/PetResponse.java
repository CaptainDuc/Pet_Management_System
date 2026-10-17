package com.petcare.platform.pet.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Schema(description = "Pet response DTO")
public record PetResponse(
        UUID id, UUID ownerId, UUID breedId,
        String name, String species, String gender,
        LocalDate dateOfBirth, BigDecimal weight,
        String photoUrl, String notes,
        boolean isActive, Instant createdAt
) {}
