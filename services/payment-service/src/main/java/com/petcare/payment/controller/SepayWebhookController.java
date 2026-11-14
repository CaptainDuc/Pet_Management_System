package com.petcare.payment.controller;

import com.petcare.payment.dto.SepayWebhookPayload;
import com.petcare.payment.dto.WebhookResponse;
import com.petcare.payment.service.SepayWebhookService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/webhooks")
@RequiredArgsConstructor
public class SepayWebhookController {

    private final SepayWebhookService webhookService;

    @PostMapping("/sepay")
    public ResponseEntity<WebhookResponse> sepay(@RequestBody SepayWebhookPayload payload) {
        return ResponseEntity.ok(webhookService.handle(payload));
    }
}
