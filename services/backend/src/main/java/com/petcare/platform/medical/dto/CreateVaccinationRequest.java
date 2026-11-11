package com.petcare.platform.medical.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.UUID;

public record CreateVaccinationRequest(
        @NotNull UUID petId,
        @NotBlank @Size(max = 255) String vaccineName,
        @NotNull @PastOrPresent LocalDate administeredDate,
        LocalDate nextDueDate,
        @Size(max = 100) String batchNumber
) {}