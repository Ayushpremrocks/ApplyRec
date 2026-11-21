package com.applyrec.repository;

import com.applyrec.entity.Interview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface InterviewRepository extends JpaRepository<Interview, Long> {

    /** Interviews in [from, to) that still need a reminder, with the data the email needs. */
    @Query("""
            SELECT i FROM Interview i
            JOIN FETCH i.application a
            JOIN FETCH a.user
            WHERE i.reminderSentAt IS NULL
              AND i.scheduledAt >= :from AND i.scheduledAt < :to
              AND a.archived = FALSE
              AND a.status <> 'Rejected'
            ORDER BY i.scheduledAt
            """)
    List<Interview> findPendingReminders(@Param("from") Instant from, @Param("to") Instant to);
}
