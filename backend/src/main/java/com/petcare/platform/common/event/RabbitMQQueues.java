package com.petcare.platform.common.event;

/**
 * Central registry for all RabbitMQ exchanges, queues, and routing keys.
 * Keeps event-bus topology in one place for easy microservice extraction.
 */
public final class RabbitMQQueues {

    private RabbitMQQueues() {}

    // ─── Dead Letter ─────────────────────────────────────────────────────────
    public static final String DLX_EXCHANGE = "petcare.dlx";

    // ─── Booking ─────────────────────────────────────────────────────────────
    public static final String BOOKING_EXCHANGE  = "petcare.booking";
    public static final String BOOKING_CREATED   = "booking.created";
    public static final String BOOKING_CONFIRMED = "booking.confirmed";
    public static final String BOOKING_CANCELLED = "booking.cancelled";
    public static final String BOOKING_COMPLETED = "booking.completed";

    // ─── Payment ─────────────────────────────────────────────────────────────
    public static final String PAYMENT_EXCHANGE   = "petcare.payment";
    public static final String PAYMENT_COMPLETED  = "payment.completed";
    public static final String PAYMENT_FAILED     = "payment.failed";

    // ─── Notification ─────────────────────────────────────────────────────────
    public static final String NOTIFICATION_EXCHANGE = "petcare.notification";
    public static final String NOTIFICATION_SEND     = "notification.send";

    // ─── Inventory ───────────────────────────────────────────────────────────
    public static final String INVENTORY_EXCHANGE  = "petcare.inventory";
    public static final String INVENTORY_LOW_STOCK = "inventory.low-stock";

    // ─── Review ──────────────────────────────────────────────────────────────
    public static final String REVIEW_EXCHANGE = "petcare.review";
    public static final String REVIEW_CREATED  = "review.created";

    // ─── Medical ─────────────────────────────────────────────────────────────
    public static final String MEDICAL_EXCHANGE  = "petcare.medical";
    public static final String VACCINATION_DUE   = "vaccination.due";
}
