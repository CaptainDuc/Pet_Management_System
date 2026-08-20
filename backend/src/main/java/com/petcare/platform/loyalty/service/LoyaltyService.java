package com.petcare.platform.loyalty.service;

import com.petcare.platform.loyalty.domain.Loyalty;
import com.petcare.platform.loyalty.repository.LoyaltyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LoyaltyService {

    private final LoyaltyRepository loyaltyRepository;

    public Loyalty getPointsByCustomer(UUID customerId) {
        return loyaltyRepository.findByCustomerId(customerId).orElse(null);
    }

    public Loyalty updatePoints(Loyalty loyalty) {
        return loyaltyRepository.save(loyalty);
    }
}
