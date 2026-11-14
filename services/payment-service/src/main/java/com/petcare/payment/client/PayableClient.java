package com.petcare.payment.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

/**
 * Fetches the authoritative payable amount from the core service. The browser
 * cannot influence the amount for booking/invoice payments.
 */
@Component
public class PayableClient {

    private final RestClient client;

    public PayableClient(
            @Value("${app.core.base-url:http://localhost:8080}") String baseUrl,
            @Value("${app.internal.api-key:petcare_internal_dev_key}") String internalApiKey) {
        this.client = RestClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("X-Internal-Key", internalApiKey)
                .build();
    }

    public PayableInfo booking(UUID bookingId) {
        return fetch("/api/v1/internal/bookings/{id}/payable", bookingId);
    }

    public PayableInfo invoice(UUID invoiceId) {
        return fetch("/api/v1/internal/invoices/{id}/payable", invoiceId);
    }

    private PayableInfo fetch(String path, UUID id) {
        try {
            PayableInfo info = client.get().uri(path, id).retrieve().body(PayableInfo.class);
            if (info == null) {
                throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                        "Core service returned an empty payable response");
            }
            return info;
        } catch (RestClientResponseException ex) {
            if (ex.getStatusCode().value() == HttpStatus.NOT_FOUND.value()) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Payable not found");
            }
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Core payable lookup failed");
        } catch (RestClientException ex) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Core service is unavailable");
        }
    }
}
