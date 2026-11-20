package com.petcare.platform.ai.controller;

import com.petcare.platform.common.dto.ApiResponse;
import com.petcare.platform.ai.service.AiService;
import com.petcare.platform.common.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;

    @PostMapping("/tips")
    public ApiResponse<Map<String, Object>> getTip(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody Map<String, String> request) {
        UUID userId = principal != null ? principal.getId() : null;
        return ApiResponse.ok(aiService.getPetCareTip(userId, request.get("question")));
    }
}
