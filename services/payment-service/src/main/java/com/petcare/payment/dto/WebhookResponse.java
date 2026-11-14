package com.petcare.payment.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record WebhookResponse(
        boolean success,
        String message,
        String orderCode,
        String status
) {
    public static WebhookResponse ok(String message) {
        return new WebhookResponse(true, message, null, null);
    }

    public static WebhookResponse ok(String message, String orderCode, String status) {
        return new WebhookResponse(true, message, orderCode, status);
    }
}
