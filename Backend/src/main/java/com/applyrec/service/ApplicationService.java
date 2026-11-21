package com.applyrec.service;

import com.applyrec.dto.ApplicationDtos.CreateOrUpdateRequest;
import com.applyrec.entity.Application;
import com.applyrec.entity.ApplicationStatus;
import com.applyrec.entity.User;
import com.applyrec.exception.BadRequestException;
import com.applyrec.exception.NotFoundException;
import com.applyrec.exception.UnauthorizedException;
import com.applyrec.repository.ApplicationRepository;
import com.applyrec.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Service
public class ApplicationService {

    private static final String NOT_FOUND = "Application not found";

    private final ApplicationRepository applicationRepository;
    private final UserRepository userRepository;

    public ApplicationService(ApplicationRepository applicationRepository, UserRepository userRepository) {
        this.applicationRepository = applicationRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public Application createApplication(Long userId, CreateOrUpdateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UnauthorizedException("User no longer exists"));

        Application app = new Application();
        app.setUser(user);
        applyRequest(app, request);
        return applicationRepository.save(app);
    }

    @Transactional(readOnly = true)
    public List<Application> getApplications(Long userId, String status, String role,
                                             BigDecimal minSalary, BigDecimal maxSalary) {
        requireUserExists(userId);
        String statusFilter = blankToNull(status);
        if (statusFilter != null && !ApplicationStatus.isValid(statusFilter)) {
            throw new BadRequestException("Invalid status filter");
        }
        if (minSalary != null && maxSalary != null && minSalary.compareTo(maxSalary) > 0) {
            throw new BadRequestException("minSalary must not exceed maxSalary");
        }
        return applicationRepository.findByUserWithFilters(
                userId, statusFilter, blankToNull(role), minSalary, maxSalary);
    }

    @Transactional(readOnly = true)
    public Application getApplication(Long userId, Long id) {
        return applicationRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new NotFoundException(NOT_FOUND));
    }

    @Transactional
    public Application updateApplication(Long userId, Long id, CreateOrUpdateRequest request) {
        Application existing = getApplication(userId, id);
        applyRequest(existing, request);
        return existing; // managed entity; flushed on commit
    }

    @Transactional
    public Application updateApplicationStatus(Long userId, Long id, String status) {
        Application existing = getApplication(userId, id);
        setStatus(existing, status);
        return existing;
    }

    @Transactional
    public void deleteApplication(Long userId, Long id) {
        applicationRepository.delete(getApplication(userId, id));
    }

    @Transactional(readOnly = true)
    public List<String> getUniqueRoles(Long userId) {
        requireUserExists(userId);
        return applicationRepository.findDistinctRolesByUserId(userId);
    }

    private void applyRequest(Application app, CreateOrUpdateRequest request) {
        app.setCompany(request.company().trim());
        app.setRole(request.role().trim());
        app.setAppliedDate(request.appliedDate());
        app.setNotes(blankToNull(request.notes()));
        app.setFollowUp(Boolean.TRUE.equals(request.followUp()));
        app.setJobId(blankToNull(request.jobId()));
        app.setSalary(request.salary());
        setStatus(app, request.status());
    }

    private static void setStatus(Application app, String status) {
        if (!ApplicationStatus.isValid(status)) {
            throw new BadRequestException("Invalid status");
        }
        if (!status.equals(app.getStatus())) {
            app.setStatus(status);
            app.setStatusUpdatedAt(Instant.now());
        }
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
