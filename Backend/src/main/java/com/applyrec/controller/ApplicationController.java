package com.applyrec.controller;

import com.applyrec.dto.ApplicationDtos.ApplicationResponse;
import com.applyrec.dto.ApplicationDtos.ArchiveRequest;
import com.applyrec.dto.ApplicationDtos.CreateOrUpdateRequest;
import com.applyrec.dto.ApplicationDtos.InterviewRequest;
import com.applyrec.dto.ApplicationDtos.StatusChangeResponse;
import com.applyrec.dto.ApplicationDtos.StatusUpdateRequest;
import com.applyrec.security.UserPrincipal;
import com.applyrec.service.ApplicationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/** Errors are translated to JSON by {@link com.applyrec.exception.GlobalExceptionHandler}. */
@RestController
@RequestMapping("/api/applications")
public class ApplicationController {

    private final ApplicationService applicationService;

    public ApplicationController(ApplicationService applicationService) {
        this.applicationService = applicationService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> createApplication(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateOrUpdateRequest request
    ) {
        ApplicationResponse app = applicationService.createApplication(principal.userId(), request);
        return Map.of(
                "message", "Application created successfully",
                "applicationId", app.id(),
                "application", app
        );
    }

    @GetMapping
    public Map<String, List<ApplicationResponse>> getApplications(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) BigDecimal minSalary,
            @RequestParam(required = false) BigDecimal maxSalary
    ) {
        return Map.of("applications",
                applicationService.getApplications(principal.userId(), status, role, minSalary, maxSalary));
    }

    @GetMapping("/roles")
    public Map<String, List<String>> getRoles(@AuthenticationPrincipal UserPrincipal principal) {
        return Map.of("roles", applicationService.getUniqueRoles(principal.userId()));
    }

    @GetMapping("/{id}")
    public Map<String, ApplicationResponse> getApplication(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id
    ) {
        return Map.of("application", applicationService.getApplication(principal.userId(), id));
    }

    @PutMapping("/{id}")
    public Map<String, Object> updateApplication(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody CreateOrUpdateRequest request
    ) {
        return Map.of(
                "message", "Application updated successfully",
                "application", applicationService.updateApplication(principal.userId(), id, request)
        );
    }

    @PatchMapping("/{id}/status")
    public Map<String, Object> updateApplicationStatus(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody StatusUpdateRequest request
    ) {
        return Map.of(
                "message", "Application status updated successfully",
                "application", applicationService.updateApplicationStatus(principal.userId(), id, request.status())
        );
    }

    @PatchMapping("/{id}/archive")
    public Map<String, Object> setArchived(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody ArchiveRequest request
    ) {
        return Map.of(
                "message", request.archived() ? "Application archived" : "Application restored",
                "application", applicationService.setArchived(principal.userId(), id, request.archived())
        );
    }

    @GetMapping("/{id}/history")
    public Map<String, List<StatusChangeResponse>> getHistory(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id
    ) {
        return Map.of("history", applicationService.getHistory(principal.userId(), id));
    }

    @DeleteMapping("/{id}")
    public Map<String, String> deleteApplication(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id
    ) {
        applicationService.deleteApplication(principal.userId(), id);
        return Map.of("message", "Application deleted successfully");
    }

    // ------------------------------------------------------------------ interviews

    @PostMapping("/{id}/interviews")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> addInterview(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody InterviewRequest request
    ) {
        return Map.of(
                "message", "Interview scheduled",
                "application", applicationService.addInterview(principal.userId(), id, request)
        );
    }

    @PutMapping("/{id}/interviews/{interviewId}")
    public Map<String, Object> updateInterview(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @PathVariable Long interviewId,
            @Valid @RequestBody InterviewRequest request
    ) {
        return Map.of(
                "message", "Interview updated",
                "application", applicationService.updateInterview(principal.userId(), id, interviewId, request)
        );
    }

    @DeleteMapping("/{id}/interviews/{interviewId}")
    public Map<String, Object> deleteInterview(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @PathVariable Long interviewId
    ) {
        return Map.of(
                "message", "Interview removed",
                "application", applicationService.deleteInterview(principal.userId(), id, interviewId)
        );
    }
}
