package com.applyrec.service;

import com.applyrec.dto.ApplicationDtos.ApplicationResponse;
import com.applyrec.dto.ApplicationDtos.CreateOrUpdateRequest;
import com.applyrec.dto.ApplicationDtos.InterviewRequest;
import com.applyrec.dto.ApplicationDtos.StatusChangeResponse;
import com.applyrec.entity.Application;
import com.applyrec.entity.ApplicationStatus;
import com.applyrec.entity.Interview;
import com.applyrec.entity.OpeningType;
import com.applyrec.entity.StatusChange;
import com.applyrec.entity.User;
import com.applyrec.exception.BadRequestException;
import com.applyrec.exception.NotFoundException;
import com.applyrec.exception.UnauthorizedException;
import com.applyrec.repository.ApplicationRepository;
import com.applyrec.repository.StatusChangeRepository;
import com.applyrec.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.DateTimeException;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.TreeSet;

/**
 * All public methods return DTOs built inside the transaction, so lazy collections
 * (tags, interviews) are always initialised before the session closes.
 */
@Service
public class ApplicationService {

    private static final String NOT_FOUND = "Application not found";
    private static final String INTERVIEW_NOT_FOUND = "Interview not found";

    private final ApplicationRepository applicationRepository;
    private final UserRepository userRepository;
    private final StatusChangeRepository statusChangeRepository;
    private final Clock clock;

    public ApplicationService(ApplicationRepository applicationRepository, UserRepository userRepository,
                              StatusChangeRepository statusChangeRepository, Clock clock) {
        this.applicationRepository = applicationRepository;
        this.userRepository = userRepository;
        this.statusChangeRepository = statusChangeRepository;
        this.clock = clock;
    }

    // ------------------------------------------------------------------ applications

    @Transactional
    public ApplicationResponse createApplication(Long userId, CreateOrUpdateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UnauthorizedException("User no longer exists"));

        Application app = new Application();
        app.setUser(user);
        applyRequest(app, request);
        Application saved = applicationRepository.save(app);
        return ApplicationResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<ApplicationResponse> getApplications(Long userId, String status, String role,
                                                     BigDecimal minSalary, BigDecimal maxSalary) {
        requireUserExists(userId);
        String statusFilter = blankToNull(status);
        if (statusFilter != null && !ApplicationStatus.isValid(statusFilter)) {
            throw new BadRequestException("Invalid status filter");
        }
        if (minSalary != null && maxSalary != null && minSalary.compareTo(maxSalary) > 0) {
            throw new BadRequestException("minSalary must not exceed maxSalary");
        }
        return applicationRepository
                .findByUserWithFilters(userId, statusFilter, blankToNull(role), minSalary, maxSalary)
                .stream()
                .map(ApplicationResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public ApplicationResponse getApplication(Long userId, Long id) {
        return ApplicationResponse.from(findOwned(userId, id));
    }

    @Transactional
    public ApplicationResponse updateApplication(Long userId, Long id, CreateOrUpdateRequest request) {
        Application existing = findOwned(userId, id);
        applyRequest(existing, request);
        return ApplicationResponse.from(existing); // managed entity; flushed on commit
    }

    @Transactional
    public ApplicationResponse updateApplicationStatus(Long userId, Long id, String status) {
        Application existing = findOwned(userId, id);
        setStatus(existing, status);
        return ApplicationResponse.from(existing);
    }

    @Transactional
    public ApplicationResponse setArchived(Long userId, Long id, boolean archived) {
        Application existing = findOwned(userId, id);
        existing.setArchived(archived);
        return ApplicationResponse.from(existing);
    }

    @Transactional
    public void deleteApplication(Long userId, Long id) {
        applicationRepository.delete(findOwned(userId, id));
    }

    @Transactional(readOnly = true)
    public List<String> getUniqueRoles(Long userId) {
        requireUserExists(userId);
        return applicationRepository.findDistinctRolesByUserId(userId);
    }

    @Transactional(readOnly = true)
    public List<StatusChangeResponse> getHistory(Long userId, Long id) {
        Application app = findOwned(userId, id);
        return statusChangeRepository.findTimeline(app.getId()).stream()
                .map(StatusChangeResponse::from)
                .toList();
    }

    // -------------------------------------------------------------------- interviews

    @Transactional
    public ApplicationResponse addInterview(Long userId, Long applicationId, InterviewRequest request) {
        Application app = findOwned(userId, applicationId);
        Interview interview = new Interview();
        applyInterview(interview, request);
        app.addInterview(interview);
        applicationRepository.flush(); // assign the interview id before building the response
        return ApplicationResponse.from(app);
    }

    @Transactional
    public ApplicationResponse updateInterview(Long userId, Long applicationId, Long interviewId,
                                               InterviewRequest request) {
        Application app = findOwned(userId, applicationId);
        Interview interview = findInterview(app, interviewId);
        Instant previous = interview.getScheduledAt();
        applyInterview(interview, request);
        if (!interview.getScheduledAt().equals(previous)) {
            interview.setReminderSentAt(null); // rescheduled: remind again
        }
        app.getInterviews().sort((a, b) -> a.getScheduledAt().compareTo(b.getScheduledAt()));
        return ApplicationResponse.from(app);
    }

    @Transactional
    public ApplicationResponse deleteInterview(Long userId, Long applicationId, Long interviewId) {
        Application app = findOwned(userId, applicationId);
        app.removeInterview(findInterview(app, interviewId));
        return ApplicationResponse.from(app);
    }

    // ----------------------------------------------------------------------- helpers

    private Application findOwned(Long userId, Long id) {
        return applicationRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new NotFoundException(NOT_FOUND));
    }

    private static Interview findInterview(Application app, Long interviewId) {
        return app.getInterviews().stream()
                .filter(i -> i.getId().equals(interviewId))
                .findFirst()
                .orElseThrow(() -> new NotFoundException(INTERVIEW_NOT_FOUND));
    }

    private void applyRequest(Application app, CreateOrUpdateRequest request) {
        app.setCompany(request.company().trim());
        app.setRole(request.role().trim());
        app.setAppliedDate(request.appliedDate());
        app.setNotes(blankToNull(request.notes()));
        app.setFollowUp(Boolean.TRUE.equals(request.followUp()));
        app.setJobId(blankToNull(request.jobId()));
        app.setSalary(request.salary());
        app.setJobUrl(blankToNull(request.jobUrl()));

        String openingType = blankToNull(request.openingType());
        app.setOpeningType(openingType);
        // A referral only applies to off-campus openings (also enforced by a DB constraint).
        app.setReferral(OpeningType.OFF_CAMPUS.equals(openingType) && Boolean.TRUE.equals(request.referral()));

        if (request.tags() != null) {
            app.replaceTags(normalizeTags(request.tags()));
        }
        setStatus(app, request.status());
    }

    private void setStatus(Application app, String status) {
        if (!ApplicationStatus.isValid(status)) {
            throw new BadRequestException("Invalid status");
        }
        String previous = app.getStatus();
        if (status.equals(previous)) {
            return;
        }
        Instant now = clock.instant();
        app.setStatus(status);
        app.setStatusUpdatedAt(now);
        if (app.getId() == null) {
            applicationRepository.save(app); // history rows need the application's id
        }
        statusChangeRepository.save(new StatusChange(app, previous, status, now));
    }

    private static void applyInterview(Interview interview, InterviewRequest request) {
        String round = blankToNull(request.round());
        interview.setRound(round == null ? "Interview" : round);
        interview.setScheduledAt(request.scheduledAt());
        interview.setTimeZone(validZone(request.timeZone()));
        interview.setLocation(blankToNull(request.location()));
        interview.setNotes(blankToNull(request.notes()));
    }

    static String validZone(String zone) {
        if (zone == null || zone.isBlank()) return "UTC";
        try {
            return ZoneId.of(zone.trim()).getId();
        } catch (DateTimeException ex) {
            return "UTC";
        }
    }

    /** Lower-cases, trims and collapses whitespace; drops blanks and duplicates. */
    static Set<String> normalizeTags(List<String> raw) {
        Set<String> tags = new TreeSet<>();
        for (String t : raw) {
            if (t == null) continue;
            String tag = t.trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
            if (!tag.isEmpty()) tags.add(tag);
        }
        return tags;
    }

    private void requireUserExists(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new UnauthorizedException("User no longer exists");
        }
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
