package com.petcare.platform.audit.service;

import com.petcare.platform.audit.domain.AuditLog;
import com.petcare.platform.audit.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    public List<AuditLog> getAllLogs() {
        return auditLogRepository.findAll();
    }

    public void log(String action, String username, String details) {
        auditLogRepository.save(AuditLog.builder()
                .action(action)
                .username(username)
                .details(details)
                .timestamp(Instant.now())
                .build());
    }
}
