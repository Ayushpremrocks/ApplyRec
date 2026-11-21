package com.applyrec.entity;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "interviews")
public class Interview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false)
    private Application application;

    @Column(nullable = false, length = 100)
    private String round;

    @Column(name = "scheduled_at", nullable = false)
    private Instant scheduledAt;

    /** IANA zone of the user who scheduled it, used to format reminder emails. */
    @Column(name = "time_zone", nullable = false, length = 64)
    private String timeZone = "UTC";

    @Column(length = 500)
    private String location;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "reminder_sent_at")
    private Instant reminderSentAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Application getApplication() { return application; }
    public void setApplication(Application application) { this.application = application; }

    public String getRound() { return round; }
    public void setRound(String round) { this.round = round; }

    public Instant getScheduledAt() { return scheduledAt; }
    public void setScheduledAt(Instant scheduledAt) { this.scheduledAt = scheduledAt; }

    public String getTimeZone() { return timeZone; }
    public void setTimeZone(String timeZone) { this.timeZone = timeZone; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public Instant getReminderSentAt() { return reminderSentAt; }
    public void setReminderSentAt(Instant reminderSentAt) { this.reminderSentAt = reminderSentAt; }

    public Instant getCreatedAt() { return createdAt; }
}
