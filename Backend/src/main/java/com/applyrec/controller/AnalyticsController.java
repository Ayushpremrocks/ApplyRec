package com.applyrec.controller;

import com.applyrec.dto.AnalyticsDtos.AnalyticsResponse;
import com.applyrec.security.UserPrincipal;
import com.applyrec.service.AnalyticsService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping
    public AnalyticsResponse getAnalytics(@AuthenticationPrincipal UserPrincipal principal) {
        return analyticsService.getAnalytics(principal.userId());
    }
}
