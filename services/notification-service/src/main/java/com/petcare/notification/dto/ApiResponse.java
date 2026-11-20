package com.petcare.notification.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;

@JsonInclude(JsonInclude.Include.NON_NULL)
@Schema(description = "Standard API response wrapper")
public record ApiResponse<T>(
        @JsonProperty("status") @Schema(description = "HTTP status code") int status,
        @JsonProperty("success") @Schema(description = "Success flag") boolean success,
        @JsonProperty("message") @Schema(description = "Message") String message,
        @JsonProperty("data") @Schema(description = "Response data") T data,
        @JsonProperty("timestamp") @Schema(description = "Timestamp") Instant timestamp
) {
    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(
                200, true, "Success", data, Instant.now()
        );
    }

    public static <T> ApiResponse<T> created(T data) {
        return new ApiResponse<>(
                201, true, "Created", data, Instant.now()
        );
    }

    public static <T> ApiResponse<T> error(int status, String message) {
        return new ApiResponse<>(
                status, false, message, null, Instant.now()
        );
    }

    public static <T> ApiResponse<T> error(int status, String message, T data) {
        return new ApiResponse<>(
                status, false, message, data, Instant.now()
        );
    }
}