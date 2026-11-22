package com.petcare.payment.controller;

import com.petcare.payment.dto.CreatePaymentRequest;
import com.petcare.payment.dto.CreatePaymentResponse;
import com.petcare.payment.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final OrderService orderService;

    @PostMapping("/create")
    public ResponseEntity<CreatePaymentResponse> create(@Valid @RequestBody CreatePaymentRequest request,
            @org.springframework.web.bind.annotation.RequestHeader(value="Authorization", required=false) String authorization) {
        return ResponseEntity.status(HttpStatus.CREATED).body(orderService.create(request, authorization));
    }
}
