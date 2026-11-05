package com.petcare.platform.staff.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;
import java.util.UUID;

@Schema(description = "Assign services a staff member can perform")
public record AssignSkillsRequest(
        @NotEmpty List<UUID> serviceIds,
        @Schema(description = "EXPERT, INTERMEDIATE or BEGINNER; default INTERMEDIATE")
        String proficiencyLevel
) {}