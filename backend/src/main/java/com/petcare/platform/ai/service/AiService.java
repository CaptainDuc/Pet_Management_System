package com.petcare.platform.ai.service;

import org.springframework.stereotype.Service;
import java.util.Map;

@Service
public class AiService {
    public Map<String, Object> getPetCareTip(String question) {
        return Map.of(
                "answer", "This is an AI stub response to: " + question,
                "status", "success"
        );
    }
}
