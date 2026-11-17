package com.petcare.platform.branch.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.math.BigDecimal;

public record CreateBranchRequest(
        @NotBlank @Size(max = 255) String name,
        @NotBlank String address,
        @Size(max = 20) String phone,
        @Email @Size(max = 255) String email,
        BigDecimal latitude,
        BigDecimal longitude
) {}