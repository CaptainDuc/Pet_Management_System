package com.petcare.platform.loyalty.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.util.UUID;

public record AdjustPointsRequest(
        @NotNull UUID userId,
        @NotNull Long pointsDelta,
        @Size(max = 500) String reason
) {}