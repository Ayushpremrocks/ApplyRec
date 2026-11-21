package com.applyrec.entity;

import java.util.List;

/** Allowed application statuses; must match the CHECK constraint in V1__init_schema.sql. */
public final class ApplicationStatus {

    public static final List<String> VALUES = List.of("Applied", "OA", "Interview", "Rejected", "Offer");
    public static final String REGEX = "Applied|OA|Interview|Rejected|Offer";

    private ApplicationStatus() {
    }

    public static boolean isValid(String status) {
        return status != null && VALUES.contains(status);
    }
}
