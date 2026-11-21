package com.applyrec.service;

import com.applyrec.dto.AnalyticsDtos.AnalyticsResponse;
import com.applyrec.dto.AnalyticsDtos.FunnelStage;
import com.applyrec.dto.AnalyticsDtos.SegmentStats;
import com.applyrec.dto.AnalyticsDtos.WeeklyCount;
import com.applyrec.entity.Application;
import com.applyrec.entity.ApplicationStatus;
import com.applyrec.entity.OpeningType;
import com.applyrec.entity.StatusChange;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Predicate;

/** Pure computation of the analytics page; no I/O so it is easy to unit test. */
public final class AnalyticsCalculator {

    static final int WEEKS = 12;
    static final int TOP_TAGS = 8;

    private AnalyticsCalculator() {
    }

    public static AnalyticsResponse compute(List<Application> apps, List<StatusChange> history,
                                            LocalDate today, Instant now) {
        Map<Long, Set<String>> reached = new HashMap<>();
        Map<Long, Instant> firstResponse = new HashMap<>();
        for (Application a : apps) {
            Set<String> set = new HashSet<>();
            set.add(a.getStatus());
            reached.put(a.getId(), set);
        }
        for (StatusChange s : history) { // ordered by changedAt
            Long appId = s.getApplication().getId();
            Set<String> set = reached.get(appId);
            if (set == null) continue;
            set.add(s.getToStatus());
            if ("Applied".equals(s.getFromStatus()) && !"Applied".equals(s.getToStatus())) {
                firstResponse.putIfAbsent(appId, s.getChangedAt());
            }
        }

        Predicate<Application> responded = a -> reached.get(a.getId()).stream().anyMatch(st -> !"Applied".equals(st));
        Predicate<Application> interviewed = a -> {
            Set<String> r = reached.get(a.getId());
            return r.contains("Interview") || r.contains("Offer");
        };
        Predicate<Application> offered = a -> reached.get(a.getId()).contains("Offer");

        int total = apps.size();
        int archived = (int) apps.stream().filter(Application::isArchived).count();

        Map<String, Integer> byStatus = new LinkedHashMap<>();
        ApplicationStatus.VALUES.forEach(s -> byStatus.put(s, 0));
        apps.forEach(a -> byStatus.merge(a.getStatus(), 1, Integer::sum));

        int reachedOa = count(apps, a -> reached.get(a.getId()).contains("OA"));
        int reachedInterview = count(apps, interviewed);
        int reachedOffer = count(apps, offered);
        List<FunnelStage> funnel = List.of(
                new FunnelStage("Applied", total, percent(total, total)),
                new FunnelStage("OA", reachedOa, percent(reachedOa, total)),
                new FunnelStage("Interview", reachedInterview, percent(reachedInterview, total)),
                new FunnelStage("Offer", reachedOffer, percent(reachedOffer, total))
        );

        List<Long> daysToResponse = new ArrayList<>();
        for (Application a : apps) {
            Instant first = firstResponse.get(a.getId());
            if (first != null) {
                LocalDate responseDay = first.atZone(ZoneOffset.UTC).toLocalDate();
                daysToResponse.add(Math.max(0, ChronoUnit.DAYS.between(a.getAppliedDate(), responseDay)));
            }
        }
        Double avgDays = daysToResponse.isEmpty() ? null
                : round(daysToResponse.stream().mapToLong(Long::longValue).average().orElse(0));

        int upcoming = (int) apps.stream()
                .filter(a -> !a.isArchived())
                .flatMap(a -> a.getInterviews().stream())
                .filter(i -> i.getScheduledAt().isAfter(now))
                .count();

        return new AnalyticsResponse(
                total,
                total - archived,
                archived,
                byStatus,
                funnel,
                percent(count(apps, responded), total),
                percent(reachedInterview, total),
                percent(reachedOffer, total),
                avgDays,
                weekly(apps, today),
                bySource(apps, interviewed, offered),
                byTag(apps, interviewed, offered),
                upcoming
        );
    }

    private static List<WeeklyCount> weekly(List<Application> apps, LocalDate today) {
        LocalDate thisWeek = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate firstWeek = thisWeek.minusWeeks(WEEKS - 1L);
        int[] counts = new int[WEEKS];
        for (Application a : apps) {
            LocalDate d = a.getAppliedDate();
            if (d == null || d.isBefore(firstWeek) || d.isAfter(thisWeek.plusDays(6))) continue;
            counts[(int) (ChronoUnit.DAYS.between(firstWeek, d) / 7)]++;
        }
        List<WeeklyCount> result = new ArrayList<>(WEEKS);
        for (int i = 0; i < WEEKS; i++) {
            result.add(new WeeklyCount(firstWeek.plusWeeks(i), counts[i]));
        }
        return result;
    }

    private static List<SegmentStats> bySource(List<Application> apps, Predicate<Application> interviewed,
                                               Predicate<Application> offered) {
        Map<String, Predicate<Application>> segments = new LinkedHashMap<>();
        segments.put("On-campus", a -> OpeningType.ON_CAMPUS.equals(a.getOpeningType()));
        segments.put("Off-campus · referral",
                a -> OpeningType.OFF_CAMPUS.equals(a.getOpeningType()) && a.isReferral());
        segments.put("Off-campus · no referral",
                a -> OpeningType.OFF_CAMPUS.equals(a.getOpeningType()) && !a.isReferral());
        segments.put("Not specified", a -> a.getOpeningType() == null);

        List<SegmentStats> result = new ArrayList<>();
        segments.forEach((label, match) -> {
            List<Application> seg = apps.stream().filter(match).toList();
            if (!seg.isEmpty()) result.add(segment(label, seg, interviewed, offered));
        });
        return result;
    }

    private static List<SegmentStats> byTag(List<Application> apps, Predicate<Application> interviewed,
                                            Predicate<Application> offered) {
        Map<String, List<Application>> byTag = new HashMap<>();
        apps.forEach(a -> a.getTags().forEach(t -> byTag.computeIfAbsent(t, k -> new ArrayList<>()).add(a)));
        return byTag.entrySet().stream()
                .sorted(Comparator.<Map.Entry<String, List<Application>>>comparingInt(e -> e.getValue().size())
                        .reversed()
                        .thenComparing(Map.Entry::getKey))
                .limit(TOP_TAGS)
                .map(e -> segment(e.getKey(), e.getValue(), interviewed, offered))
                .toList();
    }

    private static SegmentStats segment(String label, List<Application> seg, Predicate<Application> interviewed,
                                        Predicate<Application> offered) {
        int iv = count(seg, interviewed);
        return new SegmentStats(label, seg.size(), iv, count(seg, offered), percent(iv, seg.size()));
    }

    private static int count(List<Application> apps, Predicate<Application> p) {
        return (int) apps.stream().filter(p).count();
    }

    private static Double percent(int part, int whole) {
        return whole == 0 ? null : round(100.0 * part / whole);
    }

    private static double round(double v) {
        return BigDecimal.valueOf(v).setScale(1, RoundingMode.HALF_UP).doubleValue();
    }
}
