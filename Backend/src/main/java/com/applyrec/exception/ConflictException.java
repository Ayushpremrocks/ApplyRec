package com.applyrec.exception;

/** Maps to HTTP 409 Conflict. */
public class ConflictException extends RuntimeException {
    public ConflictException(String message) {
        super(message);
    }
}
