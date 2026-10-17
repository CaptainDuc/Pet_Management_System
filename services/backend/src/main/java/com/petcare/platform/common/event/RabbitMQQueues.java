package com.petcare.platform.common.event;

/**
 * Central registry for all RabbitMQ exchanges, queues, and routing keys.
 * Keeps event-bus topology in one place for easy microservice extraction.
 *
 * <p>Naming: {@code petcare.<domain>} for exchanges, a bare kebab/dot routing key for
 * events, and {@code <routing-key>.dlq} for dead-letter routing.
 */
public final class RabbitMQQueues {

    private RabbitMQQueues() {
    }

    // ─── Dead Letter ───────────────────────────────────────────────────────────────
    public static final String DLX_EXCHANGE = "petcare.dlx";
    public static final String DLQ_SUFFIX = ".dlq";

    // ─── Booking ───────────────────────────────────────────────────────────────────
    public static final String BOOKING_EXCHANGE  = "petcare.booking";
    public static final String BOOKING_CREATED   = "booking.created";
    public static final String BOOKING_CONFIRMED = "booking.confirmed";
    public static final String BOOKING_CANCELLED = "booking.cancelled";
    public static final String BOOKING_COMPLETED = "booking.completed";
    public static final String BOOKING_STARTED   = "booking.started";

    // ─── Invoice ───────────────────────────────────────────────────────────────────
    public static final String INVOICE_EXCHANGE = "petcare.invoice";
    /** Snapshot of a trustworthy invoice total, consumed by Payment Service. */
    public static final String INVOICE_ISSUED   = "invoice.issued";

    // ─── Payment ───────────────────────────────────────────────────────────────────
    public static final String PAYMENT_EXCHANGE   = "petcare.payment";
    public static final String PAYMENT_COMPLETED  = "payment.completed";
    public static final String PAYMENT_FAILED     = "payment.failed";
    public static final String PAYMENT_REFUNDED   = "payment.refunded";

    // ─── Notification ──────────────────────────────────────────────────────────────
    public static final String NOTIFICATION_EXCHANGE = "petcare.notification";
    public static final String NOTIFICATION_SEND     = "notification.send";

    // ─── Inventory ─────────────────────────────────────────────────────────────────
    public static final String INVENTORY_EXCHANGE  = "petcare.inventory";
    public static final String INVENTORY_LOW_STOCK = "inventory.low-stock";

    // ─── Review ────────────────────────────────────────────────────────────────────
    public static final String REVIEW_EXCHANGE = "petcare.review";
    public static final String REVIEW_CREATED  = "review.created";

    // ─── Medical ───────────────────────────────────────────────────────────────────
    public static final String MEDICAL_EXCHANGE = "petcare.medical";
    public static final String VACCINATION_DUE  = "vaccination.due";

    // ─── Loyalty ───────────────────────────────────────────────────────────────────
    public static final String LOYALTY_EXCHANGE       = "petcare.loyalty";
    public static final String LOYALTY_POINTS_EARNED  = "loyalty.points-earned";

    /** Dead-letter routing key for a given event. */
    public static String deadLetterRoutingKey(String routingKey) {
        return routingKey + DLQ_SUFFIX;
    }
}