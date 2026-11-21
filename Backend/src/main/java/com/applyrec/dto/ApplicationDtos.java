package com.applyrec.dto;

import com.applyrec.entity.Application;
import com.applyrec.entity.ApplicationStatus;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public final class ApplicationDtos {

    private ApplicationDtos() {
    }

    /** Salary is stored in LPA as DECIMAL(6,2), i.e. 0.00 – 9999.99. */
    public record CreateOrUpdateRequest(
            @NotBlank @Size(max = 255) String company,
            @NotBlank @Size(max = 255) String role,
            @NotBlank @Pattern(regexp = ApplicationStatus.REGEX, message = "must be one of Applied, OA, Interview, Rejected, Offer")
            String status,
            @NotNull LocalDate appliedDate,
            String notes,
            Boolean followUp,
            @Size(max = 100) String jobId,
            @DecimalMin(value = "0", message = "must not be negative")
            @DecimalMax(value = "9999.99", message = "must be at most 9999.99 LPA")
            @Digits(integer = 4, fraction = 2)
            BigDecimal salary
    ) {
    }

    public record StatusUpdateRequest(
            @NotBlank @Pattern(regexp = ApplicationStatus.REGEX, message = "must be one of Applied, OA, Interview, Rejected, Offer")
            String status
    ) {
    }

    public record ApplicationResponse(
            @JsonProperty("id") Long id,
            @JsonProperty("job_id") String jobId,
            @JsonProperty("company") String company,
            @JsonProperty("role") String role,
            @JsonProperty("status") String status,
            @JsonProperty("applied_date") LocalDate appliedDate,
            @JsonProperty("salary") BigDecimal salary,
            @JsonProperty("notes") String notes,
            @JsonProperty("follow_up") boolean followUp,
            @JsonProperty("status_updated_at") Instant statusUpdatedAt
    ) {
        public static ApplicationResponse from(Application a) {
            return new ApplicationResponse(
                    a.getId(), a.getJobId(), a.getCompany(), a.getRole(), a.getStatus(),
                    a.getAppliedDate(), a.getSalary(), a.getNotes(), a.isFollowUp(), a.getStatusUpdatedAt()
            );
        }
    }
}
