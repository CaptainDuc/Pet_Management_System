package com.petcare.platform.staff.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

public record UpdateSkillRequest(
        @NotBlank String proficiencyLevel
) {}