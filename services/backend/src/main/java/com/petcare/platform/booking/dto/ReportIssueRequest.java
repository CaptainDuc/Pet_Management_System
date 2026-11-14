package com.petcare.platform.booking.dto;

import jakarta.validation.constraints.NotBlank;

public record ReportIssueRequest(
        @NotBlank(message = "message is required") String message
) {
}
