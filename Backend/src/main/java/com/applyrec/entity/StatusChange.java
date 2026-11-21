package com.applyrec.entity;

import jakarta.persistence.*;

import java.time.Instant;

/** One row per status transition; fromStatus is null for the initial status. */
@Entity
@Table(name = "status_history")
public class StatusChange {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false)
    private Application application;

    @Column(name = "from_status", length = 20)
    private String fromStatus;

    @Column(name = "to_status", nullable = false, length = 20)
    private String toStatus;

    @Column(name = "changed_at", nullable = false)
    private Instant changedAt;

    protected StatusChange() {
    }

    public StatusChange(Application application, String fromStatus, String toStatus, Instant changedAt) {
        this.application = application;
        this.fromStatus = fromStatus;
        this.toStatus = toStatus;
        this.changedAt = changedAt;
    }

    public Long getId() { return id; }
    public Application getApplication() { return application; }
    public String getFromStatus() { return fromStatus; }
    public String getToStatus() { return toStatus; }
    public Instant getChangedAt() { return changedAt; }
}
