package com.applyrec.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public final class AnalyticsDtos {

    private AnalyticsDtos() {
    }

    /**
     * Rates are percentages (0–100) and are null when there is nothing to divide by.
     * Archived applications are included: they are still part of the user's history.
     */
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record AnalyticsResponse(
            int total,
            int active,
            int archived,
            Map<String, Integer> byStatus,
            List<FunnelStage> funnel,
            Double responseRate,
            Double interviewRate,
            Double offerRate,
            Double avgDaysToResponse,
            List<WeeklyCount> weekly,
            List<SegmentStats> bySource,
            List<SegmentStats> byTag,
            int upcomingInterviews
    ) {
    }

    /** count = applications that ever reached this stage. */
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record FunnelStage(String stage, int count, Double percent) {
    }

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record WeeklyCount(LocalDate weekStart, int count) {
    }

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record SegmentStats(String label, int total, int interviews, int offers, Double interviewRate) {
    }
}
