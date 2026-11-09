package com.petcare.platform.common.outbox;

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
public class OutboxService {

    private final OutboxEventRepository repository;
    private final ObjectMapper objectMapper;

    // MANDATORY: bắt buộc gọi bên trong một giao dịch có sẵn, để sự kiện và dữ liệu cùng thành công hoặc cùng hủy
    @Transactional(propagation = Propagation.MANDATORY)
    public void append(String aggregateType, UUID aggregateId,
                       String exchange, String eventType, Object data) {
        UUID eventId = UUID.randomUUID();
        Instant now = Instant.now();

        Map<String, Object> envelope = new LinkedHashMap<>();
        envelope.put("eventId", eventId);
        envelope.put("eventType", eventType);
        envelope.put("occurredAt", now);
        envelope.put("data", data);

        OutboxEvent event = new OutboxEvent();
        event.setId(eventId);
        event.setAggregateType(aggregateType);
        event.setAggregateId(aggregateId);
        event.setExchangeName(exchange);
        event.setEventType(eventType);
        event.setOccurredAt(now);
        try {
            event.setPayload(objectMapper.writeValueAsString(envelope));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Cannot serialize event " + eventType, e);
        }
        repository.save(event);
    }
}