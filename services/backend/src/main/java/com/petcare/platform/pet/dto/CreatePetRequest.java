package com.petcare.platform.pet.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Schema(description = "Create pet request")
public record CreatePetRequest(
        @Schema(description = "Pet name") @NotBlank String name,
        @Schema(description = "Species") @NotBlank String species,
        @Schema(description = "Breed ID") UUID breedId,
        @Schema(description = "Gender") String gender,
        @Schema(description = "Date of birth") LocalDate dateOfBirth,
        @Schema(description = "Weight (kg)") BigDecimal weight,
        @Schema(description = "Photo URL") String photoUrl,
        @Schema(description = "Notes") String notes
) {}
