package com.applyrec.mail;

/** Sends transactional email (password resets, interview reminders). */
public interface EmailSender {

    /** False when no provider is configured; callers may skip work that only exists to send mail. */
    boolean isEnabled();

    /**
     * Sends a plain-text email and returns whether the provider accepted it.
     * Implementations must not throw for delivery failures; they log and return false.
     */
    boolean send(String to, String subject, String text);
}
