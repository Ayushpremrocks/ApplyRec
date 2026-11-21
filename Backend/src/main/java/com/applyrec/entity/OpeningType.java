package com.applyrec.entity;

/** Where the job opening came from; must match the CHECK constraint in V3__features.sql. */
public final class OpeningType {

    public static final String ON_CAMPUS = "ON_CAMPUS";
    public static final String OFF_CAMPUS = "OFF_CAMPUS";
    public static final String REGEX = "ON_CAMPUS|OFF_CAMPUS";

    private OpeningType() {
    }
}
