package com.applyrec.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class HealthController {

    private static final Map<String, String> PING_RESPONSE = Map.of("status", "ok");
    private static final Map<String, String> HEALTH_RESPONSE = Map.of(
            "status", "ok",
            "message", "Server is running"
    );

    @GetMapping("/ping")
    public Map<String, String> ping() {
        return PING_RESPONSE;
    }

    @GetMapping("/api/health")
    public Map<String, String> health() {
        return HEALTH_RESPONSE;
    }
}

