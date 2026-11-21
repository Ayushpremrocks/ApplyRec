package com.applyrec.service;

import com.applyrec.dto.AnalyticsDtos.AnalyticsResponse;
import com.applyrec.entity.Application;
import com.applyrec.repository.ApplicationRepository;
import com.applyrec.repository.StatusChangeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;

@Service
public class AnalyticsService {

    private final ApplicationRepository applicationRepository;
    private final StatusChangeRepository statusChangeRepository;
    private final Clock clock;

    public AnalyticsService(ApplicationRepository applicationRepository,
                            StatusChangeRepository statusChangeRepository, Clock clock) {
        this.applicationRepository = applicationRepository;
        this.statusChangeRepository = statusChangeRepository;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public AnalyticsResponse getAnalytics(Long userId) {
        List<Application> apps = applicationRepository.findByUserWithFilters(userId, null, null, null, null);
        return AnalyticsCalculator.compute(
                apps,
                statusChangeRepository.findAllForUser(userId),
                LocalDate.now(clock),
                clock.instant()
        );
    }
}
