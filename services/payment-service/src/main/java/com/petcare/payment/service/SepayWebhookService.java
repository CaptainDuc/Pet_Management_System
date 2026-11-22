package com.petcare.payment.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.petcare.payment.config.SepayProperties;
import com.petcare.payment.dto.SepayWebhookPayload;
import com.petcare.payment.dto.WebhookResponse;
import com.petcare.payment.repository.PaymentTransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class SepayWebhookService {

    private final SepayProperties properties;
    private final PaymentTransactionRepository transactionRepository;
    private final SepayWebhookProcessor processor;
    private final ObjectMapper objectMapper;

    public WebhookResponse handle(SepayWebhookPayload payload) {
        if (payload.id() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "id is required");
        }
        if (payload.transferAmount() == null || payload.transferAmount().signum() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "transferAmount is required");
        }
        if (!"in".equalsIgnoreCase(payload.transferType())) {
            return WebhookResponse.ok("Ignored non-incoming transaction");
        }
        if (transactionRepository.existsBySepayTransactionId(payload.id())) {
            return WebhookResponse.ok("Duplicate transaction ignored");
        }

        String orderCode = extractOrderCode(payload.content());
        try {
            SepayWebhookProcessor.ProcessingResult result =
                    processor.process(payload, orderCode, toJson(payload));

            if (result.orderCode() == null) {
                return WebhookResponse.ok("Transaction recorded without a matching order",
                        null, result.status());
            }
            return WebhookResponse.ok("Transaction processed", result.orderCode(), result.status());
        } catch (DataIntegrityViolationException ex) {
            if (!transactionRepository.existsBySepayTransactionId(payload.id())) {
                throw ex;
            }
            // Concurrent delivery of the same SePay id: the unique index rejected
            // the second insert, so acknowledge it as a duplicate instead of 500.
            log.debug("Duplicate SePay transaction {} ignored", payload.id());
            return WebhookResponse.ok("Duplicate transaction ignored");
        }
    }

    private String extractOrderCode(String content) {
        if (content == null || content.isBlank()) {
            return null;
        }
        Pattern pattern = Pattern.compile("(?i)" + Pattern.quote(properties.paymentPrefix()) + "\\d+");
        Matcher matcher = pattern.matcher(content);
        return matcher.find() ? matcher.group().toUpperCase(Locale.ROOT) : null;
    }

    private String toJson(SepayWebhookPayload payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid webhook payload", ex);
        }
    }
}
