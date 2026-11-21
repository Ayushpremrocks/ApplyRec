package com.applyrec.repository;

import com.applyrec.entity.StatusChange;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface StatusChangeRepository extends JpaRepository<StatusChange, Long> {

    @Query("""
            SELECT s FROM StatusChange s
            WHERE s.application.id = :applicationId
            ORDER BY s.changedAt ASC, s.id ASC
            """)
    List<StatusChange> findTimeline(@Param("applicationId") Long applicationId);

    @Query("""
            SELECT s FROM StatusChange s
            JOIN FETCH s.application a
            WHERE a.user.id = :userId
            ORDER BY s.changedAt ASC, s.id ASC
            """)
    List<StatusChange> findAllForUser(@Param("userId") Long userId);
}
