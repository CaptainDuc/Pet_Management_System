package com.petcare.payment.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.sepay")
public record SepayProperties(
        String apiKey,
        String bankAccountNumber,
        String bankCode,
        String bankAccountName,
        String paymentPrefix,
        String qrBaseUrl
) {
}
