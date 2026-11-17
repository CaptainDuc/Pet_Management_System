package com.petcare.platform.ai.controller;

import com.petcare.platform.common.dto.ApiResponse;
import com.petcare.platform.ai.service.AiService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;

    @PostMapping("/tips")
    public ApiResponse<Map<String, Object>> getTip(@RequestBody Map<String, String> request) {
        return ApiResponse.ok(aiService.getPetCareTip(request.get("question")));
    }
}
