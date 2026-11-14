package com.petcare.payment.controller;

import com.petcare.payment.dto.OrderStatusResponse;
import com.petcare.payment.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @GetMapping("/{orderCode}/status")
    public OrderStatusResponse status(@PathVariable String orderCode) {
        return orderService.getStatus(orderCode);
    }
}
