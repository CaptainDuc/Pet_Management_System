package com.petcare.platform.audit.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.petcare.platform.audit.domain.AuditLog;
import com.petcare.platform.audit.repository.AuditLogRepository;
import com.petcare.platform.common.repository.SpecificationUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private static final int MAX_PAGE_SIZE = 200;

    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    @Transactional(propagation = Propagation.REQUIRED)
    public void logChange(String action, String entityType, UUID entityId, UUID userId,
                          Object oldValue, Object newValue) {
        auditLogRepository.save(AuditLog.builder()
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .userId(userId)
                .oldValue(oldValue == null ? null : objectMapper.valueToTree(oldValue))
                .newValue(newValue == null ? null : objectMapper.valueToTree(newValue))
                .createdAt(Instant.now())
                .build());
    }

    @Transactional(readOnly = true)
    public Page<AuditLog> search(String entityType, UUID entityId, String action, UUID userId,
                                 Instant from, Instant to, int page, int size) {
        Pageable pageable = PageRequest.of(
                Math.max(page, 0),
                Math.min(Math.max(size, 1), MAX_PAGE_SIZE),
                Sort.by(Sort.Direction.DESC, "createdAt"));

        Specification<AuditLog> spec = SpecificationUtils.allOf(
                SpecificationUtils.equalsIgnoreCase("entityType", entityType),
                SpecificationUtils.equals("entityId", entityId),
                SpecificationUtils.equalsIgnoreCase("action", action),
                SpecificationUtils.equals("userId", userId),
                SpecificationUtils.atLeast("createdAt", from),
                SpecificationUtils.atMost("createdAt", to));

        return auditLogRepository.findAll(spec, pageable);
    }
}
