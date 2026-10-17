package com.petcare.platform.common.config;

import com.petcare.platform.common.event.RabbitMQQueues;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Declares the event-bus topology. Every event queue is bound to its own topic
 * exchange with an explicit {@code x-dead-letter-routing-key}, so a message that
 * exhausts its retries lands on {@code petcare.dlx} under a predictable key
 * instead of the original routing key.
 *
 * <p>Each consuming service must bind its <em>own</em> queue to a shared routing
 * key; two services sharing one queue would split the messages between them.
 */
@Configuration
public class RabbitMQConfig {

    // ─── Message Converter ───────────────────────────────────────────────────────────

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(jsonMessageConverter());
        return template;
    }

    @Bean
    public SimpleRabbitListenerContainerFactory rabbitListenerContainerFactory(
            ConnectionFactory connectionFactory) {
        SimpleRabbitListenerContainerFactory factory = new SimpleRabbitListenerContainerFactory();
        factory.setConnectionFactory(connectionFactory);
        factory.setMessageConverter(jsonMessageConverter());
        return factory;
    }

    // ─── Dead Letter Exchange ────────────────────────────────────────────────────────

    @Bean
    public DirectExchange deadLetterExchange() {
        return new DirectExchange(RabbitMQQueues.DLX_EXCHANGE, true, false);
    }

    // ─── Helpers ────────────────────────────────────────────────────────────────────

    /** Durable queue that dead-letters to {@code petcare.dlx} under {@code <key>.dlq}. */
    private static Queue eventQueue(String name, String routingKey) {
        return QueueBuilder.durable(name)
                .withArgument("x-dead-letter-exchange", RabbitMQQueues.DLX_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", RabbitMQQueues.deadLetterRoutingKey(routingKey))
                .build();
    }

    private static Binding bind(Queue queue, TopicExchange exchange, String routingKey) {
        return BindingBuilder.bind(queue).to(exchange).with(routingKey);
    }

    // ─── Booking Exchange & Queues ───────────────────────────────────────────────────

    @Bean
    public TopicExchange bookingExchange() {
        return new TopicExchange(RabbitMQQueues.BOOKING_EXCHANGE, true, false);
    }

    @Bean
    public Queue bookingCreatedQueue() {
        return eventQueue(RabbitMQQueues.BOOKING_CREATED, RabbitMQQueues.BOOKING_CREATED);
    }

    @Bean
    public Queue bookingConfirmedQueue() {
        return eventQueue(RabbitMQQueues.BOOKING_CONFIRMED, RabbitMQQueues.BOOKING_CONFIRMED);
    }

    @Bean
    public Queue bookingCancelledQueue() {
        return eventQueue(RabbitMQQueues.BOOKING_CANCELLED, RabbitMQQueues.BOOKING_CANCELLED);
    }

    @Bean
    public Queue bookingCompletedQueue() {
        return eventQueue(RabbitMQQueues.BOOKING_COMPLETED, RabbitMQQueues.BOOKING_COMPLETED);
    }

    @Bean
    public Queue bookingStartedQueue() {
        return eventQueue(RabbitMQQueues.BOOKING_STARTED, RabbitMQQueues.BOOKING_STARTED);
    }

    @Bean
    public Binding bookingCreatedBinding() {
        return bind(bookingCreatedQueue(), bookingExchange(), RabbitMQQueues.BOOKING_CREATED);
    }

    @Bean
    public Binding bookingConfirmedBinding() {
        return bind(bookingConfirmedQueue(), bookingExchange(), RabbitMQQueues.BOOKING_CONFIRMED);
    }

    @Bean
    public Binding bookingCancelledBinding() {
        return bind(bookingCancelledQueue(), bookingExchange(), RabbitMQQueues.BOOKING_CANCELLED);
    }

    @Bean
    public Binding bookingCompletedBinding() {
        return bind(bookingCompletedQueue(), bookingExchange(), RabbitMQQueues.BOOKING_COMPLETED);
    }

    @Bean
    public Binding bookingStartedBinding() {
        return bind(bookingStartedQueue(), bookingExchange(), RabbitMQQueues.BOOKING_STARTED);
    }

    // ─── Invoice Exchange & Queues ───────────────────────────────────────────────────

    @Bean
    public TopicExchange invoiceExchange() {
        return new TopicExchange(RabbitMQQueues.INVOICE_EXCHANGE, true, false);
    }

    @Bean
    public Queue invoiceIssuedQueue() {
        return eventQueue(RabbitMQQueues.INVOICE_ISSUED, RabbitMQQueues.INVOICE_ISSUED);
    }

    @Bean
    public Binding invoiceIssuedBinding() {
        return bind(invoiceIssuedQueue(), invoiceExchange(), RabbitMQQueues.INVOICE_ISSUED);
    }

    // ─── Payment Exchange & Queues ───────────────────────────────────────────────────

    @Bean
    public TopicExchange paymentExchange() {
        return new TopicExchange(RabbitMQQueues.PAYMENT_EXCHANGE, true, false);
    }

    @Bean
    public Queue paymentCompletedQueue() {
        return eventQueue(RabbitMQQueues.PAYMENT_COMPLETED, RabbitMQQueues.PAYMENT_COMPLETED);
    }

    @Bean
    public Queue paymentFailedQueue() {
        return eventQueue(RabbitMQQueues.PAYMENT_FAILED, RabbitMQQueues.PAYMENT_FAILED);
    }

    @Bean
    public Queue paymentRefundedQueue() {
        return eventQueue(RabbitMQQueues.PAYMENT_REFUNDED, RabbitMQQueues.PAYMENT_REFUNDED);
    }

    @Bean
    public Binding paymentCompletedBinding() {
        return bind(paymentCompletedQueue(), paymentExchange(), RabbitMQQueues.PAYMENT_COMPLETED);
    }

    @Bean
    public Binding paymentFailedBinding() {
        return bind(paymentFailedQueue(), paymentExchange(), RabbitMQQueues.PAYMENT_FAILED);
    }

    @Bean
    public Binding paymentRefundedBinding() {
        return bind(paymentRefundedQueue(), paymentExchange(), RabbitMQQueues.PAYMENT_REFUNDED);
    }

    // ─── Notification Exchange & Queue ───────────────────────────────────────────────

    @Bean
    public TopicExchange notificationExchange() {
        return new TopicExchange(RabbitMQQueues.NOTIFICATION_EXCHANGE, true, false);
    }

    @Bean
    public Queue notificationQueue() {
        return eventQueue(RabbitMQQueues.NOTIFICATION_SEND, RabbitMQQueues.NOTIFICATION_SEND);
    }

    @Bean
    public Binding notificationBinding() {
        return bind(notificationQueue(), notificationExchange(), RabbitMQQueues.NOTIFICATION_SEND);
    }

    // ─── Inventory Exchange & Queue ──────────────────────────────────────────────────

    @Bean
    public TopicExchange inventoryExchange() {
        return new TopicExchange(RabbitMQQueues.INVENTORY_EXCHANGE, true, false);
    }

    @Bean
    public Queue inventoryLowStockQueue() {
        return eventQueue(RabbitMQQueues.INVENTORY_LOW_STOCK, RabbitMQQueues.INVENTORY_LOW_STOCK);
    }

    @Bean
    public Binding inventoryLowStockBinding() {
        return bind(inventoryLowStockQueue(), inventoryExchange(), RabbitMQQueues.INVENTORY_LOW_STOCK);
    }

    // ─── Review Exchange & Queue ─────────────────────────────────────────────────────

    @Bean
    public TopicExchange reviewExchange() {
        return new TopicExchange(RabbitMQQueues.REVIEW_EXCHANGE, true, false);
    }

    @Bean
    public Queue reviewCreatedQueue() {
        return eventQueue(RabbitMQQueues.REVIEW_CREATED, RabbitMQQueues.REVIEW_CREATED);
    }

    @Bean
    public Binding reviewCreatedBinding() {
        return bind(reviewCreatedQueue(), reviewExchange(), RabbitMQQueues.REVIEW_CREATED);
    }

    // ─── Medical Exchange & Queue ────────────────────────────────────────────────────

    @Bean
    public TopicExchange medicalExchange() {
        return new TopicExchange(RabbitMQQueues.MEDICAL_EXCHANGE, true, false);
    }

    @Bean
    public Queue vaccinationDueQueue() {
        return eventQueue(RabbitMQQueues.VACCINATION_DUE, RabbitMQQueues.VACCINATION_DUE);
    }

    @Bean
    public Binding vaccinationDueBinding() {
        return bind(vaccinationDueQueue(), medicalExchange(), RabbitMQQueues.VACCINATION_DUE);
    }

    // ─── Loyalty Exchange & Queue ─────────────────────────────────────────────────────

    @Bean
    public TopicExchange loyaltyExchange() {
        return new TopicExchange(RabbitMQQueues.LOYALTY_EXCHANGE, true, false);
    }

    @Bean
    public Queue loyaltyPointsEarnedQueue() {
        return eventQueue(RabbitMQQueues.LOYALTY_POINTS_EARNED, RabbitMQQueues.LOYALTY_POINTS_EARNED);
    }

    @Bean
    public Binding loyaltyPointsEarnedBinding() {
        return bind(loyaltyPointsEarnedQueue(), loyaltyExchange(), RabbitMQQueues.LOYALTY_POINTS_EARNED);
    }
}