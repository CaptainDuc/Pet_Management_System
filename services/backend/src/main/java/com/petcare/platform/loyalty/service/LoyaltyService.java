package com.petcare.platform.loyalty.service;

import com.petcare.platform.common.exception.ResourceNotFoundException;
import com.petcare.platform.loyalty.domain.LoyaltyAccount;
import com.petcare.platform.loyalty.repository.LoyaltyAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LoyaltyService {

    private final LoyaltyAccountRepository loyaltyAccountRepository;

    /**
     * Read-only view of a user's points balance.
     *
     * <p>Access control is the caller's job: see
     * {@code LoyaltyController#getCustomerAccount}, which restricts this to the
     * account owner or an ADMIN.
     */
    @Transactional(readOnly = true)
    public LoyaltyAccount getAccountByUser(UUID userId) {
        return loyaltyAccountRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Loyalty account for user", userId));
    }

    /** Lazily provisions an account so a new customer has a balance to read. */
    @Transactional
    public LoyaltyAccount getOrCreateAccount(UUID userId) {
        return loyaltyAccountRepository.findByUserId(userId)
                .orElseGet(() -> loyaltyAccountRepository.save(LoyaltyAccount.builder()
                        .userId(userId)
                        .points(0L)
                        .tier("BRONZE")
                        .build()));
    }
}