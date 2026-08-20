package com.petcare.platform.ai.controller;

import com.petcare.platform.ai.service.AiService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;

    @PostMapping("/tips")
    public ResponseEntity<Map<String, Object>> getTip(@RequestBody Map<String, String> request) {
        return ResponseEntity.ok(aiService.getPetCareTip(request.get("question")));
    }
}
