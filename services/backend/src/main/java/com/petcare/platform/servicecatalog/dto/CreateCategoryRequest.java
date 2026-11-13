package com.petcare.platform.servicecatalog.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "Create service category request")
public record CreateCategoryRequest(
        @NotBlank String name,
        String description,
        String icon
) {}