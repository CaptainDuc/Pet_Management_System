package com.petcare.payment.outbox;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageBuilder;
import org.springframework.amqp.core.MessageDeliveryMode;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class PaymentEventPublisher {

    private final PaymentEventRepository repository;
    private final RabbitTemplate rabbitTemplate;

    @Scheduled(fixedDelayString = "${app.outbox.poll-interval-ms:2000}")
    @Transactional
    public void publishPending() {
        List<PaymentEvent> batch = repository.lockUnpublished(50);
        for (PaymentEvent event : batch) {
            try {
                Message message = MessageBuilder
                        .withBody(event.getPayload().getBytes(StandardCharsets.UTF_8))
                        .setContentType(MessageProperties.CONTENT_TYPE_JSON)
                        .setMessageId(event.getId().toString())
                        .setDeliveryMode(MessageDeliveryMode.PERSISTENT)
                        .build();
                rabbitTemplate.send(event.getExchangeName(), event.getRoutingKey(), message);
                event.setPublishedAt(Instant.now());
            } catch (Exception ex) {
                log.warn("payment outbox: cannot publish {} ({}), will retry: {}",
                        event.getEventType(), event.getId(), ex.getMessage());
                break;
            }
        }
    }
}
