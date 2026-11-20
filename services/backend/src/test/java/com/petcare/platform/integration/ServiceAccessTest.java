package com.petcare.platform.integration;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;

import static org.assertj.core.api.Assertions.assertThat;

class ServiceAccessTest extends IntegrationTestBase {

    @Value("${app.internal.api-key}")
    private String internalApiKey;

    @Test
    void internalPayableErrorsKeepTheirHttpStatus() {
        for (String resource : new String[]{"bookings", "invoices"}) {
            String path = "/api/v1/internal/" + resource
                    + "/00000000-0000-0000-0000-000000000000/payable";
            var anonymous = rest.getForEntity(path, String.class);
            assertThat(anonymous.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
            assertThat(json(anonymous).path("status").asInt()).isEqualTo(401);

            HttpHeaders headers = new HttpHeaders();
            headers.set("X-Internal-Key", internalApiKey);
            var missing = rest.exchange(path, HttpMethod.GET, new HttpEntity<>(headers), String.class);
            assertThat(missing.getStatusCode()).as(missing.getBody()).isEqualTo(HttpStatus.NOT_FOUND);
            assertThat(json(missing).path("status").asInt()).isEqualTo(404);
        }
    }

    @Test
    void swaggerDocumentsArePublic() {
        for (String path : new String[]{"/api-docs", "/api-docs/swagger-config"}) {
            var response = rest.getForEntity(path, String.class);
            assertThat(response.getStatusCode()).as(path + ": " + response.getBody())
                    .isEqualTo(HttpStatus.OK);
        }
    }

    @Test
    void dockerWebOriginsCanPreflightLogin() {
        for (String origin : new String[]{"http://localhost", "http://localhost:3000",
                "http://127.0.0.1", "http://127.0.0.1:3000"}) {
            HttpHeaders headers = new HttpHeaders();
            headers.setOrigin(origin);
            headers.setAccessControlRequestMethod(HttpMethod.POST);
            headers.setAccessControlRequestHeaders(java.util.List.of("content-type"));
            var response = rest.exchange("/api/v1/auth/login", HttpMethod.OPTIONS,
                    new HttpEntity<>(headers), String.class);
            assertThat(response.getStatusCode()).as(origin).isEqualTo(HttpStatus.OK);
            assertThat(response.getHeaders().getAccessControlAllowOrigin()).isEqualTo(origin);
        }
    }

    @Test
    void unrelatedOriginsRemainBlocked() {
        HttpHeaders headers = new HttpHeaders();
        headers.setOrigin("https://untrusted.example");
        headers.setAccessControlRequestMethod(HttpMethod.POST);
        var response = rest.exchange("/api/v1/auth/login", HttpMethod.OPTIONS,
                new HttpEntity<>(headers), String.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void protectedResourcesStillRequireAuthentication() {
        var response = send(HttpMethod.GET, "/api/v1/pets", null, null);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(json(response).path("success").asBoolean()).isFalse();
    }
}
