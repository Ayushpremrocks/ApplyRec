package com.applyrec.exception;

/** Maps to HTTP 401 Unauthorized. */
public class UnauthorizedException extends RuntimeException {
    public UnauthorizedException(String message) {
        super(message);
    }
}
