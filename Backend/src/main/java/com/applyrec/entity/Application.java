package com.applyrec.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;

@Entity
@Table(name = "applications")
public class Application {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "job_id", length = 100)
    private String jobId;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 255)
    private String company;

    @Column(nullable = false, length = 255)
    private String role;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "status_updated_at", nullable = false)
    private Instant statusUpdatedAt = Instant.now();

    @Column(name = "applied_date", nullable = false)
    private LocalDate appliedDate;

    @Column(precision = 6, scale = 2)
    private BigDecimal salary;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "follow_up", nullable = false)
    private boolean followUp = false;

    @Column(name = "job_url", length = 2048)
    private String jobUrl;

    /** {@link OpeningType#ON_CAMPUS}, {@link OpeningType#OFF_CAMPUS} or null (not specified). */
    @Column(name = "opening_type", length = 20)
    private String openingType;

    /** Only meaningful (and only allowed by the DB) for off-campus openings. */
    @Column(nullable = false)
    private boolean referral = false;

    @Column(nullable = false)
    private boolean archived = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @ElementCollection
    @CollectionTable(name = "application_tags", joinColumns = @JoinColumn(name = "application_id"))
    @Column(name = "tag", length = 30, nullable = false)
    private Set<String> tags = new TreeSet<>();

    @OneToMany(mappedBy = "application", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("scheduledAt ASC")
    private List<Interview> interviews = new ArrayList<>();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getJobId() { return jobId; }
    public void setJobId(String jobId) { this.jobId = jobId; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public String getCompany() { return company; }
    public void setCompany(String company) { this.company = company; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Instant getStatusUpdatedAt() { return statusUpdatedAt; }
    public void setStatusUpdatedAt(Instant statusUpdatedAt) { this.statusUpdatedAt = statusUpdatedAt; }

    public LocalDate getAppliedDate() { return appliedDate; }
    public void setAppliedDate(LocalDate appliedDate) { this.appliedDate = appliedDate; }

    public BigDecimal getSalary() { return salary; }
    public void setSalary(BigDecimal salary) { this.salary = salary; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public boolean isFollowUp() { return followUp; }
    public void setFollowUp(boolean followUp) { this.followUp = followUp; }

    public String getJobUrl() { return jobUrl; }
    public void setJobUrl(String jobUrl) { this.jobUrl = jobUrl; }

    public String getOpeningType() { return openingType; }
    public void setOpeningType(String openingType) { this.openingType = openingType; }

    public boolean isReferral() { return referral; }
    public void setReferral(boolean referral) { this.referral = referral; }

    public boolean isArchived() { return archived; }
    public void setArchived(boolean archived) { this.archived = archived; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Set<String> getTags() { return tags; }

    /** Replaces the tag set in place so Hibernate tracks the change. */
    public void replaceTags(Set<String> newTags) {
        tags.clear();
        tags.addAll(newTags);
    }

    public List<Interview> getInterviews() { return interviews; }

    public void addInterview(Interview interview) {
        interview.setApplication(this);
        interviews.add(interview);
    }

    public void removeInterview(Interview interview) {
        interviews.remove(interview);
        interview.setApplication(null);
    }
}
