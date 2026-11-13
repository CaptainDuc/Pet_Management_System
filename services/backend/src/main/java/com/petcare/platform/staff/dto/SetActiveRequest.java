package com.petcare.platform.staff.dto;

import jakarta.validation.constraints.NotNull;

public record SetActiveRequest(@NotNull Boolean isActive) {}