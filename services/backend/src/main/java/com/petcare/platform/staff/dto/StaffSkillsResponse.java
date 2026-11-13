package com.petcare.platform.staff.dto;

import java.util.List;
import java.util.UUID;

public record StaffSkillsResponse(UUID staffId, List<SkillResponse> skills) {}