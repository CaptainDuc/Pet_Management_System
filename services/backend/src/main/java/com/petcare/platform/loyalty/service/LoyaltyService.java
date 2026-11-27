package com.petcare.platform.loyalty.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.petcare.platform.common.exception.ResourceNotFoundException;
import com.petcare.platform.loyalty.domain.LoyaltyAccount;
import com.petcare.platform.loyalty.repository.LoyaltyAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LoyaltyService {

    private final LoyaltyAccountRepository loyaltyAccountRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Tier configuration: points threshold (1 point = 10,000 VND lifetime spending)
// New account: no tier -> Đồng (500k VND = 50 pts) -> Bạc (1M VND = 100 pts)
// -> Vàng (2M VND = 200 pts) -> Bạch kim (3M VND = 300 pts) -> Kim cương (5M VND = 500 pts)
    private static final List<TierConfig> TIER_CONFIG = List.of(
            new TierConfig("CHƯA CÓ HẠNG", 0, 0, List.of("Tích điểm 1 điểm/10.000đ chi tiêu", "Nhận tin tức khuyến mãi")),
            new TierConfig("ĐỒNG", 50, 2, List.of("Tích điểm 1 điểm/10.000đ", "Giảm 2% tất cả dịch vụ", "Miễn phí khám 1 lần/năm")),
            new TierConfig("BẠC", 100, 3, List.of("Tích điểm 1 điểm/10.000đ", "Giảm 3% tất cả dịch vụ", "Miễn phí khám 2 lần/năm", "Ưu tiên đặt chỗ dịp lễ")),
            new TierConfig("VÀNG", 200, 5, List.of("Tích điểm 1 điểm/10.000đ", "Giảm 5% tất cả dịch vụ", "Miễn phí khám 3 lần/năm", "Ưu tiên đặt chỗ dịp lễ", "Quà sinh nhật thú cưng")),
            new TierConfig("BẠCH KIM", 300, 7, List.of("Tích điểm 1 điểm/10.000đ", "Giảm 7% tất cả dịch vụ", "Miễn phí khám không giới hạn", "Hotline bác sĩ 24/7", "Ưu tiên tuyệt đối dịp lễ", "Tặng gói spa thú cưng 1 lần/năm")),
            new TierConfig("KIM CƯƠNG", 500, 10, List.of("Tích điểm 1 điểm/10.000đ", "Giảm 10% tất cả dịch vụ", "Miễn phí khám không giới hạn", "Hotline bác sĩ 24/7 ưu tiên", "Ưu tiên tuyệt đối mọi lúc", "Tặng gói spa thú cưng 2 lần/năm", "Quà sinh nhật đặc biệt", "Miễn phí vận chuyển thuốc/thức ăn"))
    );

    public record TierConfig(String name, long minPoints, int discountPercent, List<String> benefits) {}

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
                        .lifetimePoints(0L)
                        .tier("CHƯA CÓ HẠNG")
                        .tierAchievedAt(Instant.now())
                        .benefitsClaimed("[]")
                        .build()));
    }

    @Transactional
    public LoyaltyAccount adjustPoints(UUID userId, long pointsDelta, String reason) {
        LoyaltyAccount account = loyaltyAccountRepository.findByUserId(userId)
                .orElseGet(() -> LoyaltyAccount.builder()
                        .userId(userId)
                        .points(0L)
                        .lifetimePoints(0L)
                        .tier("CHƯA CÓ HẠNG")
                        .tierAchievedAt(Instant.now())
                        .benefitsClaimed("[]")
                        .build());
        long newPoints = account.getPoints() + pointsDelta;
        if (newPoints < 0) {
            throw new IllegalArgumentException("Points cannot go below zero");
        }
        account.setPoints(newPoints);
        account.setLifetimePoints(account.getLifetimePoints() + Math.max(0, pointsDelta));
        checkAndUpgradeTier(account);
        return loyaltyAccountRepository.save(account);
    }

    /** Add points from spending (1 point per 10,000 VND) */
    @Transactional
    public LoyaltyAccount addPointsFromSpending(UUID userId, long amountVnd) {
        long pointsEarned = amountVnd / 10000;
        if (pointsEarned <= 0) return getOrCreateAccount(userId);
        return adjustPoints(userId, pointsEarned, "Spending: " + amountVnd + " VND");
    }

    private void checkAndUpgradeTier(LoyaltyAccount account) {
        // Find the highest tier the user qualifies for based on current points
        TierConfig qualifiedTier = TIER_CONFIG.stream()
                .filter(t -> account.getPoints() >= t.minPoints())
                .max(java.util.Comparator.comparingLong(TierConfig::minPoints))
                .orElse(TIER_CONFIG.get(0));

        if (!qualifiedTier.name().equals(account.getTier())) {
            account.setTier(qualifiedTier.name());
            account.setTierAchievedAt(Instant.now());
            // Auto-claim benefits for new tier
            claimTierBenefits(account, qualifiedTier);
        }
    }

    private void claimTierBenefits(LoyaltyAccount account, TierConfig config) {
        try {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> claimed = objectMapper.readValue(
                    account.getBenefitsClaimed() == null || account.getBenefitsClaimed().isBlank() ? "[]" : account.getBenefitsClaimed(),
                    List.class
            );
            claimed = new java.util.ArrayList<>(claimed);
            claimed.add(Map.of(
                    "tier", config.name(),
                    "claimedAt", Instant.now().toString(),
                    "benefits", config.benefits()
            ));
            account.setBenefitsClaimed(objectMapper.writeValueAsString(claimed));
        } catch (Exception e) {
            // Ignore serialization errors
        }
    }

    public TierConfig getTierConfig(String tierName) {
        return TIER_CONFIG.stream()
                .filter(t -> t.name().equals(tierName))
                .findFirst()
                .orElse(TIER_CONFIG.get(0));
    }

    public List<TierConfig> getAllTierConfigs() {
        return TIER_CONFIG;
    }

    public TierConfig getNextTier(String currentTier) {
        TierConfig current = getTierConfig(currentTier);
        return TIER_CONFIG.stream()
                .filter(t -> t.minPoints() > current.minPoints())
                .findFirst()
                .orElse(null);
    }

    /** Get discount percentage for a tier */
    public int getDiscountPercent(String tier) {
        return getTierConfig(tier).discountPercent();
    }

    /** Get all tier benefits for display */
    public List<Map<String, Object>> getTierBenefits() {
        return TIER_CONFIG.stream().map(t -> Map.of(
                "name", t.name(),
                "minPoints", t.minPoints(),
                "discountPercent", t.discountPercent(),
                "benefits", t.benefits()
        )).collect(Collectors.toList());
    }
}