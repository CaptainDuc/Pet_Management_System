package com.petcare.platform.common.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import static com.petcare.platform.common.event.RabbitMQQueues.*;

@Configuration
public class RabbitMQConfig {

    // ─── Message Converter ───────────────────────────────────────────────────
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

    // ─── Dead Letter Exchange ─────────────────────────────────────────────────
    @Bean
    public DirectExchange deadLetterExchange() {
        return new DirectExchange(DLX_EXCHANGE);
    }

    // ─── Booking Exchange & Queues ────────────────────────────────────────────
    @Bean
    public TopicExchange bookingExchange() {
        return new TopicExchange(BOOKING_EXCHANGE);
    }

    @Bean
    public Queue bookingCreatedQueue() {
        return QueueBuilder.durable(BOOKING_CREATED)
                .withArgument("x-dead-letter-exchange", DLX_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", BOOKING_CREATED + ".dlq")
                .build();
    }

    @Bean
    public Queue bookingConfirmedQueue() {
        return QueueBuilder.durable(BOOKING_CONFIRMED)
                .withArgument("x-dead-letter-exchange", DLX_EXCHANGE)
                .build();
    }

    @Bean
    public Queue bookingCancelledQueue() {
        return QueueBuilder.durable(BOOKING_CANCELLED)
                .withArgument("x-dead-letter-exchange", DLX_EXCHANGE)
                .build();
    }

    @Bean
    public Queue bookingCompletedQueue() {
        return QueueBuilder.durable(BOOKING_COMPLETED)
                .withArgument("x-dead-letter-exchange", DLX_EXCHANGE)
                .build();
    }

    @Bean public Binding bookingCreatedBinding() {
        return BindingBuilder.bind(bookingCreatedQueue()).to(bookingExchange()).with(BOOKING_CREATED);
    }
    @Bean public Binding bookingConfirmedBinding() {
        return BindingBuilder.bind(bookingConfirmedQueue()).to(bookingExchange()).with(BOOKING_CONFIRMED);
    }
    @Bean public Binding bookingCancelledBinding() {
        return BindingBuilder.bind(bookingCancelledQueue()).to(bookingExchange()).with(BOOKING_CANCELLED);
    }
    @Bean public Binding bookingCompletedBinding() {
        return BindingBuilder.bind(bookingCompletedQueue()).to(bookingExchange()).with(BOOKING_COMPLETED);
    }

    // ─── Payment Exchange & Queues ────────────────────────────────────────────
    @Bean
    public TopicExchange paymentExchange() {
        return new TopicExchange(PAYMENT_EXCHANGE);
    }

    @Bean
    public Queue paymentCompletedQueue() {
        return QueueBuilder.durable(PAYMENT_COMPLETED)
                .withArgument("x-dead-letter-exchange", DLX_EXCHANGE)
                .build();
    }

    @Bean
    public Queue paymentFailedQueue() {
        return QueueBuilder.durable(PAYMENT_FAILED)
                .withArgument("x-dead-letter-exchange", DLX_EXCHANGE)
                .build();
    }

    @Bean public Binding paymentCompletedBinding() {
        return BindingBuilder.bind(paymentCompletedQueue()).to(paymentExchange()).with(PAYMENT_COMPLETED);
    }
    @Bean public Binding paymentFailedBinding() {
        return BindingBuilder.bind(paymentFailedQueue()).to(paymentExchange()).with(PAYMENT_FAILED);
    }

    // ─── Notification Exchange & Queue ────────────────────────────────────────
    @Bean
    public TopicExchange notificationExchange() {
        return new TopicExchange(NOTIFICATION_EXCHANGE);
    }

    @Bean
    public Queue notificationQueue() {
        return QueueBuilder.durable(NOTIFICATION_SEND)
                .withArgument("x-dead-letter-exchange", DLX_EXCHANGE)
                .build();
    }

    @Bean public Binding notificationBinding() {
        return BindingBuilder.bind(notificationQueue()).to(notificationExchange()).with(NOTIFICATION_SEND);
    }

    // ─── Inventory Exchange & Queue ───────────────────────────────────────────
    @Bean
    public TopicExchange inventoryExchange() {
        return new TopicExchange(INVENTORY_EXCHANGE);
    }

    @Bean
    public Queue inventoryLowStockQueue() {
        return QueueBuilder.durable(INVENTORY_LOW_STOCK)
                .withArgument("x-dead-letter-exchange", DLX_EXCHANGE)
                .build();
    }

    @Bean public Binding inventoryLowStockBinding() {
        return BindingBuilder.bind(inventoryLowStockQueue()).to(inventoryExchange()).with(INVENTORY_LOW_STOCK);
    }

    // ─── Review Exchange & Queue ──────────────────────────────────────────────
    @Bean
    public TopicExchange reviewExchange() {
        return new TopicExchange(REVIEW_EXCHANGE);
    }

    @Bean
    public Queue reviewCreatedQueue() {
        return QueueBuilder.durable(REVIEW_CREATED)
                .withArgument("x-dead-letter-exchange", DLX_EXCHANGE)
                .build();
    }

    @Bean public Binding reviewCreatedBinding() {
        return BindingBuilder.bind(reviewCreatedQueue()).to(reviewExchange()).with(REVIEW_CREATED);
    }

    // ─── Vaccination Exchange & Queue ─────────────────────────────────────────
    @Bean
    public TopicExchange medicalExchange() {
        return new TopicExchange(MEDICAL_EXCHANGE);
    }

    @Bean
    public Queue vaccinationDueQueue() {
        return QueueBuilder.durable(VACCINATION_DUE)
                .withArgument("x-dead-letter-exchange", DLX_EXCHANGE)
                .build();
    }

    @Bean public Binding vaccinationDueBinding() {
        return BindingBuilder.bind(vaccinationDueQueue()).to(medicalExchange()).with(VACCINATION_DUE);
    }
}
