package com.applyrec.dto;

import com.applyrec.entity.Application;
import com.applyrec.entity.ApplicationStatus;
import com.applyrec.entity.Interview;
import com.applyrec.entity.OpeningType;
import com.applyrec.entity.StatusChange;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
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
import java.util.List;

public final class ApplicationDtos {

    private ApplicationDtos() {
    }

    static final String STATUS_MESSAGE = "must be one of Applied, OA, Interview, Rejected, Offer";

    /** Salary is stored in LPA as DECIMAL(6,2), i.e. 0.00 – 9999.99. */
    public record CreateOrUpdateRequest(
            @NotBlank @Size(max = 255) String company,
            @NotBlank @Size(max = 255) String role,
            @NotBlank @Pattern(regexp = ApplicationStatus.REGEX, message = STATUS_MESSAGE)
            String status,
            @NotNull LocalDate appliedDate,
            String notes,
            Boolean followUp,
            @Size(max = 100) String jobId,
            @DecimalMin(value = "0", message = "must not be negative")
            @DecimalMax(value = "9999.99", message = "must be at most 9999.99 LPA")
            @Digits(integer = 4, fraction = 2)
            BigDecimal salary,
            @Size(max = 2048)
            @Pattern(regexp = "^(?i)https?://\\S+$", message = "must be a valid http(s) link")
            String jobUrl,
            @Pattern(regexp = OpeningType.REGEX, message = "must be ON_CAMPUS or OFF_CAMPUS")
            String openingType,
            Boolean referral,
            @Size(max = 10, message = "must have at most 10 tags")
            List<@NotBlank @Size(max = 30, message = "must be at most 30 characters") String> tags
    ) {
    }

    public record StatusUpdateRequest(
            @NotBlank @Pattern(regexp = ApplicationStatus.REGEX, message = STATUS_MESSAGE)
            String status
    ) {
    }

    public record ArchiveRequest(@NotNull Boolean archived) {
    }

    public record InterviewRequest(
            @Size(max = 100) String round,
            @NotNull Instant scheduledAt,
            @Size(max = 64) String timeZone,
            @Size(max = 500) String location,
            @Size(max = 5000) String notes
    ) {
    }

    public record InterviewResponse(
            @JsonProperty("id") Long id,
            @JsonProperty("round") String round,
            @JsonProperty("scheduled_at") Instant scheduledAt,
            @JsonProperty("time_zone") String timeZone,
            @JsonProperty("location") String location,
            @JsonProperty("notes") String notes
    ) {
        public static InterviewResponse from(Interview i) {
            return new InterviewResponse(i.getId(), i.getRound(), i.getScheduledAt(), i.getTimeZone(),
                    i.getLocation(), i.getNotes());
        }
    }

    public record StatusChangeResponse(
            @JsonProperty("id") Long id,
            @JsonProperty("from_status") String fromStatus,
            @JsonProperty("to_status") String toStatus,
            @JsonProperty("changed_at") Instant changedAt
    ) {
        public static StatusChangeResponse from(StatusChange s) {
            return new StatusChangeResponse(s.getId(), s.getFromStatus(), s.getToStatus(), s.getChangedAt());
        }
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
            @JsonProperty("status_updated_at") Instant statusUpdatedAt,
            @JsonProperty("job_url") String jobUrl,
            @JsonProperty("opening_type") String openingType,
            @JsonProperty("referral") boolean referral,
            @JsonProperty("archived") boolean archived,
            @JsonProperty("tags") List<String> tags,
            @JsonProperty("interviews") List<InterviewResponse> interviews
    ) {
        /** Must be called inside a transaction: reads the lazy tag and interview collections. */
        public static ApplicationResponse from(Application a) {
            return new ApplicationResponse(
                    a.getId(), a.getJobId(), a.getCompany(), a.getRole(), a.getStatus(),
                    a.getAppliedDate(), a.getSalary(), a.getNotes(), a.isFollowUp(), a.getStatusUpdatedAt(),
                    a.getJobUrl(), a.getOpeningType(), a.isReferral(), a.isArchived(),
                    a.getTags().stream().sorted().toList(),
                    a.getInterviews().stream().map(InterviewResponse::from).toList()
            );
        }
    }
}
