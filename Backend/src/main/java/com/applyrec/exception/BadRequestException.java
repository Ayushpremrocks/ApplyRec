package com.applyrec.exception;

/** Maps to HTTP 400 Bad Request. */
public class BadRequestException extends RuntimeException {
    public BadRequestException(String message) {
        super(message);
    }
}
