package com.petcare.platform.integration;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Executors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class EmailVerificationTest extends IntegrationTestBase {
    private String address() { return "verify-" + UUID.randomUUID() + "@petcare.invalid"; }
    private JsonNode requestRegistration(String email) {
        ResponseEntity<String> response = send(HttpMethod.POST, "/api/v1/auth/register", null,
                Map.of("email", email, "fullName", "Email verification test", "password", PASSWORD));
        assertThat(response.getStatusCode()).as(response.getBody()).isEqualTo(HttpStatus.ACCEPTED);
        return json(response).path("data");
    }
    private ResponseEntity<String> verify(String email, JsonNode challenge, String code) {
        return send(HttpMethod.POST, "/api/v1/auth/register/verify", null,
                Map.of("email", email, "challengeId", challenge.path("challengeId").asText(), "code", code));
    }
    private JsonNode requestReset(String email) {
        ResponseEntity<String> response = send(HttpMethod.POST, "/api/v1/auth/password/forgot", null, Map.of("email", email));
        assertThat(response.getStatusCode()).as(response.getBody()).isEqualTo(HttpStatus.ACCEPTED);
        return json(response).path("data");
    }
    private ResponseEntity<String> reset(String email, JsonNode challenge, String code, String password) {
        return send(HttpMethod.POST, "/api/v1/auth/password/reset", null,
                Map.of("email", email, "challengeId", challenge.path("challengeId").asText(), "code", code, "newPassword", password));
    }

    @Test void registrationCreatesNeitherUserNorSessionUntilEmailIsVerified() {
        String email = address();
        JsonNode challenge = requestRegistration(email);
        assertThat(challenge.has("accessToken")).isFalse();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM users WHERE email=?", Integer.class, email)).isZero();
        assertThat(send(HttpMethod.POST, "/api/v1/auth/login", null, Map.of("email", email, "password", PASSWORD)).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        String code = emailedCode(email, "REGISTER");
        assertThat(jdbc.queryForObject("SELECT code_hash FROM auth_email_codes WHERE email=?", String.class, email)).isNotEqualTo(code).startsWith("$2");
        assertThat(jdbc.queryForObject("SELECT password_hash FROM auth_email_codes WHERE email=?", String.class, email)).isNotEqualTo(PASSWORD).startsWith("$2");
        ResponseEntity<String> result = verify(email, challenge, code);
        assertThat(result.getStatusCode()).as(result.getBody()).isEqualTo(HttpStatus.CREATED);
        assertThat(json(result).path("data").path("accessToken").asText()).isNotBlank();
        assertThat(verify(email, challenge, code).getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
    }

    @Test void wrongAttemptsCommitAndLockTheChallengeAfterFiveFailures() {
        String email = address(); JsonNode challenge = requestRegistration(email);
        String code = emailedCode(email, "REGISTER");
        String wrong = code.equals("000000") ? "111111" : "000000";
        for (int i=1; i<=5; i++) {
            assertThat(verify(email, challenge, wrong).getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
            assertThat(jdbc.queryForObject("SELECT attempts FROM auth_email_codes WHERE email=? AND purpose='REGISTER'", Integer.class, email)).isEqualTo(i);
        }
        assertThat(verify(email, challenge, code).getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM users WHERE email=?", Integer.class, email)).isZero();
    }

    @Test void expiredCodeAndInvalidFormatCannotCreateAccount() {
        String email = address(); JsonNode challenge = requestRegistration(email);
        assertThat(verify(email, challenge, "123").getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        jdbc.update("UPDATE auth_email_codes SET expires_at=NOW()-INTERVAL '1 second' WHERE email=?", email);
        assertThat(verify(email, challenge, emailedCode(email, "REGISTER")).getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
    }

    @Test void resendingIsThrottledAndReplacesTheChallenge() {
        String email = address(); JsonNode first = requestRegistration(email); String oldCode = emailedCode(email, "REGISTER");
        assertThat(send(HttpMethod.POST, "/api/v1/auth/register/resend", null, Map.of("email", email)).getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
        jdbc.update("UPDATE auth_email_codes SET sent_at=NOW()-INTERVAL '61 seconds' WHERE email=?", email);
        ResponseEntity<String> resent = send(HttpMethod.POST, "/api/v1/auth/register/resend", null, Map.of("email", email));
        assertThat(resent.getStatusCode()).isEqualTo(HttpStatus.ACCEPTED);
        JsonNode second = json(resent).path("data");
        assertThat(second.path("challengeId")).isNotEqualTo(first.path("challengeId"));
        assertThat(verify(email, first, oldCode).getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(verify(email, second, emailedCode(email, "REGISTER")).getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }

    @Test void oldBrowserCannotVerifyARegistrationReplacedByAnotherDraft() {
        String email = address(); JsonNode old = requestRegistration(email);
        jdbc.update("UPDATE auth_email_codes SET sent_at=NOW()-INTERVAL '61 seconds' WHERE email=?", email);
        JsonNode current = requestRegistration(email);
        assertThat(verify(email, old, emailedCode(email, "REGISTER")).getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(verify(email, current, emailedCode(email, "REGISTER")).getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }

    @Test void onlyOneConcurrentVerificationCreatesAnAccount() throws Exception {
        String email = address(); JsonNode challenge = requestRegistration(email); String code = emailedCode(email, "REGISTER");
        try (var pool = Executors.newFixedThreadPool(2)) {
            var a = pool.submit(() -> verify(email, challenge, code).getStatusCode());
            var b = pool.submit(() -> verify(email, challenge, code).getStatusCode());
            assertThat(java.util.List.of(a.get(), b.get())).containsExactlyInAnyOrder(HttpStatus.CREATED, HttpStatus.UNPROCESSABLE_ENTITY);
        }
        assertThat(jdbc.queryForObject("SELECT count(*) FROM users WHERE email=?", Integer.class, email)).isEqualTo(1);
    }

    @Test void passwordResetNeedsItsOwnCodeAndRevokesCoreSessions() {
        TestUser user = newUser("CUSTOMER");
        ResponseEntity<String> oldLogin = send(HttpMethod.POST, "/api/v1/auth/login", null, Map.of("email", user.email(), "password", PASSWORD));
        String oldRefresh = json(oldLogin).path("data").path("refreshToken").asText();
        JsonNode challenge = requestReset(user.email()); String code = emailedCode(user.email(), "RESET");
        assertThat(reset(user.email(), challenge, code.equals("000000") ? "111111" : "000000", "NewPassw0rd!123").getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(send(HttpMethod.POST, "/api/v1/auth/login", null, Map.of("email", user.email(), "password", PASSWORD)).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(reset(user.email(), challenge, code, "NewPassw0rd!123").getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(send(HttpMethod.POST, "/api/v1/auth/login", null, Map.of("email", user.email(), "password", PASSWORD)).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(send(HttpMethod.POST, "/api/v1/auth/login", null, Map.of("email", user.email(), "password", "NewPassw0rd!123")).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(send(HttpMethod.GET, "/api/v1/users/me", user.token(), null).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(send(HttpMethod.POST, "/api/v1/auth/refresh", null, Map.of("refreshToken", oldRefresh)).getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(reset(user.email(), challenge, code, "OtherPassw0rd!123").getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
    }

    @Test void unknownEmailHasSameResetResponseAndDoesNotSendOrCreateAccount() {
        String email = address(); JsonNode challenge = requestReset(email);
        assertThat(challenge.path("message").asText()).contains("Nếu email");
        org.mockito.Mockito.verify(emailSender, never()).send(eq(email), eq("RESET"), anyString(), anyInt());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM users WHERE email=?", Integer.class, email)).isZero();
    }

    @Test void registrationCodeCannotResetPassword() {
        String email = address(); JsonNode challenge = requestRegistration(email);
        assertThat(reset(email, challenge, emailedCode(email, "REGISTER"), "NewPassw0rd!123").getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(verify(email, challenge, emailedCode(email, "REGISTER")).getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }

    @Test void mailFailureRollsBackPendingChallengeAndNeverReportsSuccess() {
        String email = address();
        doThrow(new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Email unavailable"))
                .when(emailSender).send(eq(email), eq("REGISTER"), anyString(), anyInt());
        ResponseEntity<String> response = send(HttpMethod.POST, "/api/v1/auth/register", null,
                Map.of("email", email, "fullName", "Mail failure", "password", PASSWORD));
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM auth_email_codes WHERE email=?", Integer.class, email)).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM users WHERE email=?", Integer.class, email)).isZero();
    }

    @Test void requestingMoreThanFiveCodesPerHourIsRejected() {
        String email = address(); requestReset(email);
        for (int i=1; i<5; i++) {
            jdbc.update("UPDATE auth_email_codes SET sent_at=NOW()-INTERVAL '61 seconds' WHERE email=?", email);
            requestReset(email);
        }
        jdbc.update("UPDATE auth_email_codes SET sent_at=NOW()-INTERVAL '61 seconds' WHERE email=?", email);
        assertThat(send(HttpMethod.POST, "/api/v1/auth/password/forgot", null, Map.of("email", email)).getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
    }
}
