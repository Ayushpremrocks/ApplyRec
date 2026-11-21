package com.applyrec.service;

import com.applyrec.dto.AnalyticsDtos.AnalyticsResponse;
import com.applyrec.dto.AnalyticsDtos.SegmentStats;
import com.applyrec.entity.Application;
import com.applyrec.entity.Interview;
import com.applyrec.entity.StatusChange;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class AnalyticsCalculatorTest {

    private static final LocalDate TODAY = LocalDate.parse("2025-06-11"); // a Wednesday
    private static final Instant NOW = Instant.parse("2025-06-11T12:00:00Z");

    private long nextId = 1;

    private Application app(String status, String applied, String openingType, boolean referral, String... tags) {
        Application a = new Application();
        a.setId(nextId++);
        a.setStatus(status);
        a.setAppliedDate(LocalDate.parse(applied));
        a.setOpeningType(openingType);
        a.setReferral(referral);
        a.replaceTags(Set.of(tags));
        return a;
    }

    private static StatusChange change(Application a, String from, String to, String at) {
        return new StatusChange(a, from, to, Instant.parse(at));
    }

    @Test
    void emptyInputHasNullRates() {
        AnalyticsResponse r = AnalyticsCalculator.compute(List.of(), List.of(), TODAY, NOW);
        assertThat(r.total()).isZero();
        assertThat(r.responseRate()).isNull();
        assertThat(r.avgDaysToResponse()).isNull();
        assertThat(r.weekly()).hasSize(12).allMatch(w -> w.count() == 0);
        assertThat(r.bySource()).isEmpty();
    }

    @Test
    void computesFunnelRatesAndResponseTime() {
        Application applied = app("Applied", "2025-06-02", null, false);
        Application oaThenRejected = app("Rejected", "2025-05-01", "ON_CAMPUS", false, "dream");
        Application interview = app("Interview", "2025-05-20", "OFF_CAMPUS", true, "dream", "remote");
        Application offer = app("Offer", "2025-05-10", "OFF_CAMPUS", false);
        offer.setArchived(true);

        List<StatusChange> history = new ArrayList<>(List.of(
                change(oaThenRejected, "Applied", "OA", "2025-05-05T09:00:00Z"),      // 4 days
                change(oaThenRejected, "OA", "Rejected", "2025-05-12T09:00:00Z"),
                change(interview, "Applied", "Interview", "2025-05-30T09:00:00Z"),   // 10 days
                change(offer, null, "Offer", "2025-05-10T09:00:00Z")                 // created as Offer
        ));

        AnalyticsResponse r = AnalyticsCalculator.compute(
                List.of(applied, oaThenRejected, interview, offer), history, TODAY, NOW);

        assertThat(r.total()).isEqualTo(4);
        assertThat(r.archived()).isEqualTo(1);
        assertThat(r.active()).isEqualTo(3);
        assertThat(r.byStatus()).containsEntry("Rejected", 1).containsEntry("Applied", 1);
        assertThat(r.funnel()).extracting(f -> f.stage() + "=" + f.count())
                .containsExactly("Applied=4", "OA=1", "Interview=2", "Offer=1");
        assertThat(r.responseRate()).isEqualTo(75.0);
        assertThat(r.interviewRate()).isEqualTo(50.0);
        assertThat(r.offerRate()).isEqualTo(25.0);
        assertThat(r.avgDaysToResponse()).isEqualTo(7.0);

        assertThat(r.bySource()).extracting(SegmentStats::label).containsExactly(
                "On-campus", "Off-campus · referral", "Off-campus · no referral", "Not specified");
        SegmentStats referral = r.bySource().get(1);
        assertThat(referral.total()).isEqualTo(1);
        assertThat(referral.interviewRate()).isEqualTo(100.0);

        assertThat(r.byTag().get(0).label()).isEqualTo("dream");
        assertThat(r.byTag().get(0).total()).isEqualTo(2);
    }

    @Test
    void weeklyBucketsStartOnMondayAndEndThisWeek() {
        Application thisWeek = app("Applied", "2025-06-09", null, false);   // Monday this week
        Application lastWeek = app("Applied", "2025-06-08", null, false);   // Sunday last week
        Application tooOld = app("Applied", "2025-01-01", null, false);

        AnalyticsResponse r = AnalyticsCalculator.compute(List.of(thisWeek, lastWeek, tooOld), List.of(), TODAY, NOW);

        assertThat(r.weekly().get(11).weekStart()).isEqualTo(LocalDate.parse("2025-06-09"));
        assertThat(r.weekly().get(11).count()).isEqualTo(1);
        assertThat(r.weekly().get(10).count()).isEqualTo(1);
        assertThat(r.weekly().stream().mapToInt(w -> w.count()).sum()).isEqualTo(2);
    }

    @Test
    void countsOnlyFutureInterviewsOfActiveApplications() {
        Application a = app("Interview", "2025-06-01", null, false);
        Interview past = new Interview();
        past.setScheduledAt(NOW.minusSeconds(60));
        Interview future = new Interview();
        future.setScheduledAt(NOW.plusSeconds(3600));
        a.addInterview(past);
        a.addInterview(future);

        Application archived = app("Interview", "2025-06-01", null, false);
        archived.setArchived(true);
        Interview hidden = new Interview();
        hidden.setScheduledAt(NOW.plusSeconds(3600));
        archived.addInterview(hidden);

        assertThat(AnalyticsCalculator.compute(List.of(a, archived), List.of(), TODAY, NOW).upcomingInterviews())
                .isEqualTo(1);
    }
}
