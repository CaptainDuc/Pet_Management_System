package com.petcare.platform.loyalty.controller;

import com.petcare.platform.loyalty.domain.Loyalty;
import com.petcare.platform.loyalty.service.LoyaltyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/loyalty")
@RequiredArgsConstructor
public class LoyaltyController {

    private final LoyaltyService loyaltyService;

    @GetMapping("/customer/{customerId}")
    public ResponseEntity<Loyalty> get(@PathVariable UUID customerId) {
        return ResponseEntity.ok(loyaltyService.getPointsByCustomer(customerId));
    }

    @PostMapping
    public ResponseEntity<Loyalty> save(@RequestBody Loyalty loyalty) {
        return ResponseEntity.ok(loyaltyService.updatePoints(loyalty));
    }
}
