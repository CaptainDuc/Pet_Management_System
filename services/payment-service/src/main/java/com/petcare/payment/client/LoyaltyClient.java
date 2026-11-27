package com.petcare.payment.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.UUID;

/**
 * Calls the loyalty service to get the discount percentage for a user.
 */
@Component
public class LoyaltyClient {

    private final RestClient client;

    public LoyaltyClient(
            @Value("${app.core.base-url:http://localhost:8080}") String baseUrl,
            @Value("${app.internal.api-key:petcare_internal_dev_key}") String internalApiKey) {
        this.client = RestClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("X-Internal-Key", internalApiKey)
                .build();
    }

    /**
     * Get the discount percentage for a user by user ID.
     * Uses internal API key for service-to-service communication.
     */
    public int getDiscountPercent(UUID userId) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = client.get()
                    .uri("/api/v1/internal/loyalty/discount/{userId}", userId)
                    .retrieve()
                    .body(Map.class);
            if (response != null && response.get("data") != null) {
                @SuppressWarnings("unchecked")
                Map<String, Object> data = (Map<String, Object>) response.get("data");
                Object discount = data.get("discountPercent");
                if (discount instanceof Number) {
                    return ((Number) discount).intValue();
                }
            }
            return 0;
        } catch (RestClientResponseException ex) {
            if (ex.getStatusCode().value() == HttpStatus.NOT_FOUND.value()) {
                return 0;
            }
            return 0;
        } catch (RestClientException ex) {
            return 0;
        }
    }
}