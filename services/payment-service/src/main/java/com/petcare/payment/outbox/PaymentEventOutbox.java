package com.petcare.payment.outbox;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PaymentEventOutbox {

    private final PaymentEventRepository repository;
    private final ObjectMapper objectMapper;

    @Transactional(propagation = Propagation.MANDATORY)
    public void append(UUID aggregateId, String eventType, String exchange,
                       String routingKey, Object data) {
        UUID eventId = UUID.randomUUID();
        Instant now = Instant.now();

        Map<String, Object> envelope = new LinkedHashMap<>();
        envelope.put("eventId", eventId);
        envelope.put("eventType", eventType);
        envelope.put("occurredAt", now);
        envelope.put("data", data);

        PaymentEvent event = PaymentEvent.builder()
                .aggregateId(aggregateId)
                .eventType(eventType)
                .exchangeName(exchange)
                .routingKey(routingKey)
                .occurredAt(now)
                .build();
        try {
            event.setPayload(objectMapper.writeValueAsString(envelope));
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Cannot serialize payment event " + eventType, ex);
        }
        repository.save(event);
    }
}
