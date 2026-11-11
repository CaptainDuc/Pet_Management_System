package com.petcare.platform.medical.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record UpdateMedicalRecordRequest(
        @NotNull @PastOrPresent LocalDate visitDate,
        @Size(max = 5000) String diagnosis,
        @Size(max = 5000) String treatment,
        @Size(max = 5000) String notes
) {}