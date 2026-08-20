package com.petcare.platform.audit.repository;

import com.petcare.platform.audit.domain.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {
}
