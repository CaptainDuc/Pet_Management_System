package com.petcare.platform.auth.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@Component
public class AuthEmailSender {
    private final RestClient client;

    public AuthEmailSender(@Value("${app.notification.base-url:http://localhost:8083}") String url,
                           @Value("${app.internal.api-key:petcare_internal_dev_key}") String key) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3000);
        factory.setReadTimeout(15000);
        client = RestClient.builder().baseUrl(url).requestFactory(factory).defaultHeader("X-Internal-Key", key).build();
    }

    public void send(String email, String purpose, String code, int expiresInSeconds) {
        try {
            client.post().uri("/internal/auth-email")
                    .body(Map.of("email", email, "purpose", purpose, "code", code, "expiresInSeconds", expiresInSeconds))
                    .retrieve().toBodilessEntity();
        } catch (RestClientException ex) {
            // Never expose provider messages, credentials or the code to the browser.
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Chưa gửi được email xác nhận. Vui lòng thử lại sau.");
        }
    }
}
