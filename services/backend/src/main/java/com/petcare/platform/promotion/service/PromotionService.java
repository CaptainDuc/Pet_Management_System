package com.petcare.platform.promotion.service;

import com.petcare.platform.common.exception.BusinessException;
import com.petcare.platform.common.event.RabbitMQQueues;
import com.petcare.platform.common.outbox.OutboxService;
import com.petcare.platform.promotion.domain.DiscountType;
import com.petcare.platform.promotion.domain.Promotion;
import com.petcare.platform.promotion.domain.PromotionRedemption;
import com.petcare.platform.promotion.domain.RedemptionStatus;
import com.petcare.platform.promotion.dto.AppliedPromotion;
import com.petcare.platform.promotion.dto.CreatePromotionRequest;
import com.petcare.platform.promotion.dto.PromotionResponse;
import com.petcare.platform.promotion.dto.PromotionValidationResponse;
import com.petcare.platform.promotion.dto.UpdatePromotionRequest;
import com.petcare.platform.promotion.repository.PromotionRedemptionRepository;
import com.petcare.platform.promotion.repository.PromotionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PromotionService {

    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final PromotionRepository promotionRepository;
    private final PromotionRedemptionRepository redemptionRepository;
    private final JdbcClient jdbc;
    private final OutboxService outboxService;

    @Transactional(readOnly = true)
    public List<PromotionResponse> findAll() {
        return promotionRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(PromotionResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public PromotionResponse findById(UUID id) {
        Promotion promotion = promotionRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy mã khuyến mãi"));
        return PromotionResponse.from(promotion);
    }

    @Transactional(readOnly = true)
    public List<PromotionResponse> mine(UUID userId) {
        List<UUID> ids = jdbc.sql("""
                select p.id from promotion_grants g join promotions p on p.id = g.promotion_id
                where g.user_id = :userId
                  and (p.end_date is null or p.end_date >= :today)
                  and not exists (select 1 from promotion_redemptions r join bookings b on b.id=r.booking_id
                                  where r.promotion_id=p.id and b.customer_id=:userId
                                    and r.status in ('RESERVED','CONSUMED'))
                order by p.created_at desc
                """).param("userId", userId).param("today", LocalDate.now(ZONE))
                .query(UUID.class).list();
        return ids.stream().map(promotionRepository::findById).flatMap(java.util.Optional::stream)
                .map(PromotionResponse::from).toList();
    }

    @Transactional
    public PromotionResponse create(CreatePromotionRequest request) {
        String code = normalize(request.code());
        if (promotionRepository.existsByCodeIgnoreCase(code)) {
            throw new BusinessException("Mã khuyến mãi '" + code + "' đã tồn tại trên hệ thống");
        }

        validatePromotionConfig(request.discountType(), request.discountValue(), request.startDate(), request.endDate());

        Promotion promotion = new Promotion();
        promotion.setCode(code);
        promotion.setName(request.name().trim());
        promotion.setDiscountType(request.discountType());
        promotion.setDiscountValue(request.discountValue());
        promotion.setMinOrderAmount(request.minOrderAmount() != null ? request.minOrderAmount() : BigDecimal.ZERO);
        promotion.setMaxUses(request.maxUses());
        promotion.setUsedCount(0);
        promotion.setStartDate(request.startDate());
        promotion.setEndDate(request.endDate());
        promotion.setActive(request.active() == null || request.active());
        promotion.setGiftAllExisting(Boolean.TRUE.equals(request.giftAllExisting()));

        Promotion saved = promotionRepository.saveAndFlush(promotion);
        if (saved.isGiftAllExisting()) {
            jdbc.sql("""
                    insert into promotion_grants(promotion_id,user_id)
                    select :promotionId,u.id from users u
                    where u.role='CUSTOMER'
                      and not exists (select 1 from user_roles ur join roles r on r.id=ur.role_id
                                      where ur.user_id=u.id and r.name<>'CUSTOMER')
                      and u.email<>'owner@petcare.vn'
                    """).param("promotionId", saved.getId()).update();
            List<UUID> recipients = jdbc.sql("select user_id from promotion_grants where promotion_id=:id")
                    .param("id", saved.getId()).query(UUID.class).list();
            if (saved.getMaxUses() != null && saved.getMaxUses() < recipients.size()) {
                throw new BusinessException("Tổng lượt dùng phải đủ cho toàn bộ khách được tặng (" + recipients.size() + " khách).");
            }
            String body = "Bạn được tặng mã " + saved.getCode() + " cho chương trình " + saved.getName()
                    + ". Áp dụng khi đặt lịch" + (saved.getEndDate() == null ? "." : " trước ngày " + saved.getEndDate() + ".");
            for (UUID recipient : recipients) {
                outboxService.append("Promotion", saved.getId(), RabbitMQQueues.NOTIFICATION_EXCHANGE,
                        RabbitMQQueues.NOTIFICATION_SEND,
                        Map.of("customerId", recipient, "title", "Bạn có mã ưu đãi mới", "body", body));
            }
        }
        return PromotionResponse.from(saved);
    }

    @Transactional
    public PromotionResponse update(UUID id, UpdatePromotionRequest request) {
        Promotion promotion = promotionRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy mã khuyến mãi"));

        validatePromotionConfig(request.discountType(), request.discountValue(), request.startDate(), request.endDate());

        promotion.setName(request.name().trim());
        promotion.setDiscountType(request.discountType());
        promotion.setDiscountValue(request.discountValue());
        promotion.setMinOrderAmount(request.minOrderAmount() != null ? request.minOrderAmount() : BigDecimal.ZERO);
        promotion.setMaxUses(request.maxUses());
        if (promotion.isGiftAllExisting() && request.maxUses() != null) {
            long recipients = jdbc.sql("select count(*) from promotion_grants where promotion_id=:id")
                    .param("id", id).query(Long.class).single();
            if (request.maxUses() < recipients) {
                throw new BusinessException("Tổng lượt dùng phải đủ cho toàn bộ khách được tặng (" + recipients + " khách).");
            }
        }
        promotion.setStartDate(request.startDate());
        promotion.setEndDate(request.endDate());
        if (request.active() != null) {
            promotion.setActive(request.active());
        }

        Promotion saved = promotionRepository.save(promotion);
        return PromotionResponse.from(saved);
    }

    @Transactional
    public PromotionResponse toggleActive(UUID id) {
        Promotion promotion = promotionRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy mã khuyến mãi"));
        promotion.setActive(!promotion.isActive());
        Promotion saved = promotionRepository.save(promotion);
        return PromotionResponse.from(saved);
    }

    @Transactional
    public void delete(UUID id) {
        Promotion promotion = promotionRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy mã khuyến mãi"));

        if (redemptionRepository.existsByPromotionId(id)) {
            promotion.setActive(false);
            promotionRepository.save(promotion);
            throw new BusinessException("Mã khuyến mãi đã có lượt sử dụng hoặc đang trong đơn đặt lịch. Hệ thống đã tự động chuyển sang trạng thái 'Ngưng hoạt động' để bảo toàn dữ liệu.");
        }

        promotionRepository.delete(promotion);
    }

    @Transactional(readOnly = true)
    public PromotionValidationResponse validate(String rawCode, BigDecimal subtotal, UUID customerId) {
        String code = normalize(rawCode);
        BigDecimal total = safe(subtotal);
        Promotion promotion = promotionRepository.findByCodeIgnoreCase(code).orElse(null);
        if (promotion == null) {
            return invalid(code, total, "PROMOTION_NOT_FOUND", "Mã giảm giá không tồn tại");
        }

        long reserved = redemptionRepository.countByPromotionIdAndStatus(
                promotion.getId(), RedemptionStatus.RESERVED);
        Rejection rejection = rejection(promotion, total, reserved, LocalDate.now(ZONE));
        if (rejection != null) {
            return invalid(code, total, rejection.reason(), rejection.message());
        }
        rejection = giftRejection(promotion, customerId);
        if (rejection != null) return invalid(code, total, rejection.reason(), rejection.message());

        BigDecimal discount = calculateDiscount(promotion, total);
        return new PromotionValidationResponse(true, code,
                promotion.getDiscountType().name(), promotion.getDiscountValue(),
                total, discount, total.subtract(discount), null, "Mã giảm giá hợp lệ");
    }

    /**
     * Reserves one usage for a booking. The usage is counted against max_uses
     * from the moment of reservation, but used_count only grows when the
     * booking is paid (see {@link #consume(UUID)}).
     */
    @Transactional
    public AppliedPromotion reserve(String rawCode, BigDecimal subtotal, UUID bookingId, UUID customerId) {
        String code = normalize(rawCode);
        BigDecimal total = safe(subtotal);
        Promotion promotion = promotionRepository.findByCodeForUpdate(code)
                .orElseThrow(() -> new BusinessException("Mã giảm giá không tồn tại"));

        long reserved = redemptionRepository.countByPromotionIdAndStatus(
                promotion.getId(), RedemptionStatus.RESERVED);
        Rejection rejection = rejection(promotion, total, reserved, LocalDate.now(ZONE));
        if (rejection != null) {
            throw new BusinessException(rejection.message());
        }
        rejection = giftRejection(promotion, customerId);
        if (rejection != null) throw new BusinessException(rejection.message());

        BigDecimal discount = calculateDiscount(promotion, total);
        PromotionRedemption redemption = new PromotionRedemption();
        redemption.setPromotionId(promotion.getId());
        redemption.setBookingId(bookingId);
        redemption.setStatus(RedemptionStatus.RESERVED);
        redemptionRepository.save(redemption);

        return new AppliedPromotion(promotion.getId(), promotion.getCode(), total,
                discount, total.subtract(discount));
    }

    /** Marks the reservation as consumed and increments the promotion usage counter. */
    @Transactional
    public void consume(UUID bookingId) {
        PromotionRedemption redemption = redemptionRepository.findByBookingId(bookingId).orElse(null);
        if (redemption == null || redemption.getStatus() != RedemptionStatus.RESERVED) {
            return;
        }

        Promotion promotion = promotionRepository.findByIdForUpdate(redemption.getPromotionId())
                .orElse(null);
        if (promotion != null) {
            int used = promotion.getUsedCount() == null ? 0 : promotion.getUsedCount();
            promotion.setUsedCount(used + 1);
            promotionRepository.save(promotion);
        }

        redemption.setStatus(RedemptionStatus.CONSUMED);
        redemption.setConsumedAt(Instant.now());
        redemptionRepository.save(redemption);
    }

    /** Releases a reservation when an unpaid booking is cancelled. */
    @Transactional
    public void release(UUID bookingId) {
        PromotionRedemption redemption = redemptionRepository.findByBookingId(bookingId).orElse(null);
        if (redemption == null || redemption.getStatus() != RedemptionStatus.RESERVED) {
            return;
        }
        redemption.setStatus(RedemptionStatus.RELEASED);
        redemption.setReleasedAt(Instant.now());
        redemptionRepository.save(redemption);
    }

    private void validatePromotionConfig(DiscountType type, BigDecimal value, LocalDate start, LocalDate end) {
        if (type == DiscountType.PERCENTAGE) {
            if (value == null || value.compareTo(BigDecimal.ZERO) <= 0 || value.compareTo(BigDecimal.valueOf(100)) > 0) {
                throw new BusinessException("Mức giảm phần trăm phải nằm trong khoảng từ 0.01% đến 100%");
            }
        } else if (type == DiscountType.FIXED_AMOUNT) {
            if (value == null || value.compareTo(BigDecimal.ZERO) <= 0) {
                throw new BusinessException("Số tiền giảm cố định phải lớn hơn 0");
            }
        }
        if (start != null && end != null && end.isBefore(start)) {
            throw new BusinessException("Ngày kết thúc không được sớm hơn ngày bắt đầu");
        }
    }

    private Rejection rejection(Promotion promotion, BigDecimal subtotal, long reserved, LocalDate today) {
        if (!promotion.isActive()) {
            return new Rejection("PROMOTION_INACTIVE", "Mã giảm giá đã bị tạm dừng");
        }
        if (promotion.getStartDate() != null && today.isBefore(promotion.getStartDate())) {
            return new Rejection("PROMOTION_NOT_STARTED", "Mã giảm giá chưa đến ngày sử dụng");
        }
        if (promotion.getEndDate() != null && today.isAfter(promotion.getEndDate())) {
            return new Rejection("PROMOTION_EXPIRED", "Mã giảm giá đã hết hạn");
        }
        BigDecimal minOrder = promotion.getMinOrderAmount() == null
                ? BigDecimal.ZERO : promotion.getMinOrderAmount();
        if (subtotal.compareTo(minOrder) < 0) {
            return new Rejection("MIN_ORDER_NOT_MET",
                    "Đơn hàng tối thiểu để dùng mã là " + minOrder.toPlainString() + "đ");
        }
        if (promotion.getMaxUses() != null) {
            int used = promotion.getUsedCount() == null ? 0 : promotion.getUsedCount();
            if (used + reserved >= promotion.getMaxUses()) {
                return new Rejection("PROMOTION_USAGE_LIMIT", "Mã giảm giá đã hết lượt sử dụng");
            }
        }
        if (promotion.getDiscountType() == DiscountType.PERCENTAGE) {
            BigDecimal value = promotion.getDiscountValue();
            if (value == null || value.signum() <= 0 || value.compareTo(BigDecimal.valueOf(100)) > 0) {
                return new Rejection("INVALID_DISCOUNT_CONFIG", "Mã giảm giá được cấu hình không hợp lệ");
            }
        } else if (promotion.getDiscountValue() == null
                || promotion.getDiscountValue().signum() < 0) {
            return new Rejection("INVALID_DISCOUNT_CONFIG", "Mã giảm giá được cấu hình không hợp lệ");
        }
        return null;
    }

    private Rejection giftRejection(Promotion promotion, UUID customerId) {
        if (!promotion.isGiftAllExisting()) return null;
        if (customerId == null || !jdbc.sql("""
                select exists(select 1 from promotion_grants where promotion_id=:promotionId and user_id=:userId)
                """).param("promotionId", promotion.getId()).param("userId", customerId)
                .query(Boolean.class).single()) {
            return new Rejection("PROMOTION_NOT_GRANTED", "Mã này chỉ dành cho khách đã được tặng.");
        }
        boolean used = jdbc.sql("""
                select exists(select 1 from promotion_redemptions r join bookings b on b.id=r.booking_id
                              where r.promotion_id=:promotionId and b.customer_id=:userId
                                and r.status in ('RESERVED','CONSUMED'))
                """).param("promotionId", promotion.getId()).param("userId", customerId)
                .query(Boolean.class).single();
        return used ? new Rejection("PROMOTION_ALREADY_USED", "Bạn đã dùng mã này cho một lịch hẹn khác.") : null;
    }

    private BigDecimal calculateDiscount(Promotion promotion, BigDecimal subtotal) {
        BigDecimal discount;
        if (promotion.getDiscountType() == DiscountType.PERCENTAGE) {
            discount = subtotal.multiply(promotion.getDiscountValue())
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        } else {
            discount = promotion.getDiscountValue();
        }
        return discount.min(subtotal).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
    }

    private PromotionValidationResponse invalid(String code, BigDecimal subtotal,
                                                String reason, String message) {
        return new PromotionValidationResponse(false, code, null, null,
                subtotal, BigDecimal.ZERO.setScale(2), subtotal, reason, message);
    }

    private String normalize(String code) {
        if (code == null || code.isBlank()) {
            throw new BusinessException("Vui lòng nhập mã giảm giá");
        }
        return code.trim().toUpperCase(Locale.ROOT);
    }

    private BigDecimal safe(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value.max(BigDecimal.ZERO);
    }

    private record Rejection(String reason, String message) {
    }
}
