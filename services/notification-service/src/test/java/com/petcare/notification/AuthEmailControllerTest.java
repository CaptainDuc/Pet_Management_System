package com.petcare.notification;

import com.petcare.notification.controller.AuthEmailController;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.mockito.ArgumentCaptor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthEmailController.class)
@TestPropertySource(properties={"app.internal.api-key=test-internal-key","app.mail.from=test@petcare.invalid"})
class AuthEmailControllerTest {
    @Autowired MockMvc mvc;
    @MockBean JavaMailSender sender;
    private static final String BODY = "{\"email\":\"test@petcare.invalid\",\"purpose\":\"REGISTER\",\"code\":\"123456\",\"expiresInSeconds\":600}";

    @Test void missingOrWrongInternalKeyCannotSendEmail() throws Exception {
        mvc.perform(post("/internal/auth-email").contentType("application/json").content(BODY)).andExpect(status().isUnauthorized());
        mvc.perform(post("/internal/auth-email").header("X-Internal-Key","wrong").contentType("application/json").content(BODY)).andExpect(status().isUnauthorized());
        verifyNoInteractions(sender);
    }
    @Test void validRequestSendsCodeToRequestedMailbox() throws Exception {
        mvc.perform(post("/internal/auth-email").header("X-Internal-Key","test-internal-key").contentType("application/json").content(BODY)).andExpect(status().isOk());
        var mail=ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(sender).send(mail.capture());
        assertThat(mail.getValue().getTo()).containsExactly("test@petcare.invalid");
        assertThat(mail.getValue().getText()).contains("123456","10 phút");
        assertThat(mail.getValue().getSubject()).contains("đăng ký");
    }
    @Test void invalidCodeFormatCannotSendEmail() throws Exception {
        mvc.perform(post("/internal/auth-email").header("X-Internal-Key","test-internal-key").contentType("application/json")
                .content(BODY.replace("123456","123"))).andExpect(status().isBadRequest());
        verifyNoInteractions(sender);
    }
    @Test void smtpFailureReturnsUnavailable() throws Exception {
        doThrow(new MailSendException("Unavailable")).when(sender).send(any(SimpleMailMessage.class));
        mvc.perform(post("/internal/auth-email").header("X-Internal-Key","test-internal-key").contentType("application/json").content(BODY)).andExpect(status().isServiceUnavailable());
    }
}
