package com.petcare.platform.booking.dto;

import jakarta.validation.constraints.NotBlank;

public record CancelRequest(@NotBlank String reason) {}