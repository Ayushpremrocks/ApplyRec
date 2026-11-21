package com.applyrec.mail;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Used when no email provider is configured. In development it logs the full message
 * (so reset links can be copied from the console); otherwise only that mail was skipped,
 * because the body can contain a password reset token.
 */
public class LoggingEmailSender implements EmailSender {

    private static final Logger log = LoggerFactory.getLogger(LoggingEmailSender.class);

    private final boolean logBodies;

    public LoggingEmailSender(boolean logBodies) {
        this.logBodies = logBodies;
    }

    @Override
    public boolean isEnabled() {
        return false;
    }

    @Override
    public boolean send(String to, String subject, String text) {
        if (logBodies) {
            log.info("[email disabled] To: {}\nSubject: {}\n\n{}", to, subject, text);
        } else {
            log.warn("[email disabled] Skipped '{}'. Set RESEND_API_KEY to send email.", subject);
        }
        return false;
    }
}
