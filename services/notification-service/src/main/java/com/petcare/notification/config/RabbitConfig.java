package com.petcare.notification.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitConfig {

    public static final String BOOKING_EXCHANGE = "petcare.booking";
    public static final String BOOKING_QUEUE = "notification.booking-events";

    // Phải khai báo giống hệt sàn mà core đã tạo (topic, durable), nếu khác RabbitMQ sẽ từ chối
    @Bean
    public TopicExchange bookingExchange() {
        return new TopicExchange(BOOKING_EXCHANGE, true, false);
    }

    @Bean
    public Queue notificationBookingQueue() {
        return QueueBuilder.durable(BOOKING_QUEUE).build();
    }

    @Bean
    public Binding notificationBookingBinding(Queue notificationBookingQueue, TopicExchange bookingExchange) {
        return BindingBuilder.bind(notificationBookingQueue).to(bookingExchange).with("booking.*");
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}