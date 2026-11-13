package com.petcare.platform.invoice.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record IssueInvoiceRequest(@NotNull UUID bookingId) {}