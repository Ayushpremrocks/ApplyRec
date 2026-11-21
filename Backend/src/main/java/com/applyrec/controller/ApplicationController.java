package com.applyrec.controller;

import com.applyrec.dto.ApplicationDtos.ApplicationResponse;
import com.applyrec.dto.ApplicationDtos.CreateOrUpdateRequest;
import com.applyrec.dto.ApplicationDtos.StatusUpdateRequest;
import com.applyrec.entity.Application;
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
        Application app = applicationService.createApplication(principal.userId(), request);
        return Map.of(
                "message", "Application created successfully",
                "applicationId", app.getId(),
                "application", ApplicationResponse.from(app)
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
        List<ApplicationResponse> apps = applicationService
                .getApplications(principal.userId(), status, role, minSalary, maxSalary)
                .stream()
                .map(ApplicationResponse::from)
                .toList();
        return Map.of("applications", apps);
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
        return Map.of("application", ApplicationResponse.from(applicationService.getApplication(principal.userId(), id)));
    }

    @PutMapping("/{id}")
    public Map<String, Object> updateApplication(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody CreateOrUpdateRequest request
    ) {
        Application app = applicationService.updateApplication(principal.userId(), id, request);
        return Map.of(
                "message", "Application updated successfully",
                "application", ApplicationResponse.from(app)
        );
    }

    @PatchMapping("/{id}/status")
    public Map<String, Object> updateApplicationStatus(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody StatusUpdateRequest request
    ) {
        Application app = applicationService.updateApplicationStatus(principal.userId(), id, request.status());
        return Map.of(
                "message", "Application status updated successfully",
                "application", ApplicationResponse.from(app)
        );
    }

    @DeleteMapping("/{id}")
    public Map<String, String> deleteApplication(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id
    ) {
        applicationService.deleteApplication(principal.userId(), id);
        return Map.of("message", "Application deleted successfully");
    }
}
