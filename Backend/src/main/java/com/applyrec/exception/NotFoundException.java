package com.applyrec.exception;

/** Maps to HTTP 404 Not Found. */
public class NotFoundException extends RuntimeException {
    public NotFoundException(String message) {
        super(message);
    }
}
