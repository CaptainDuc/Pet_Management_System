package com.petcare.platform.audit.repository;

import com.petcare.platform.audit.domain.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.UUID;

/**
 * Filtering is done with {@code Specification} rather than a hand-written query.
 *
 * <p>The previous {@code @Query} used {@code (:entityType IS NULL OR ...)} for every
 * filter. With a null parameter PostgreSQL cannot infer the bind type and the call
 * fails with "could not determine data type of parameter". A specification only adds
 * the predicates whose value is actually present, which avoids that whole class of
 * failure and keeps the SQL index-friendly.
 */
@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID>, JpaSpecificationExecutor<AuditLog> {
}