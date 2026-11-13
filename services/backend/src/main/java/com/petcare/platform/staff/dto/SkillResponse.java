package com.petcare.platform.staff.dto;

import java.time.Instant;
import java.util.UUID;

public record SkillResponse(UUID id, UUID serviceId, String proficiencyLevel, Instant createdAt) {}