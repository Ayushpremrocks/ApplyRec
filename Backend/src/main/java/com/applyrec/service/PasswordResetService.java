package com.applyrec.service;

import com.applyrec.entity.PasswordResetToken;
import com.applyrec.entity.User;
import com.applyrec.exception.BadRequestException;
import com.applyrec.mail.EmailSender;
import com.applyrec.repository.PasswordResetTokenRepository;
import com.applyrec.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.concurrent.Executor;

@Service
public class PasswordResetService {

    static final Duration TOKEN_TTL = Duration.ofMinutes(30);
    private static final String INVALID_LINK = "This reset link is invalid or has expired. Please request a new one.";

    private final SecureRandom random = new SecureRandom();
    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailSender emailSender;
    private final Executor mailExecutor;
    private final Clock clock;
    private final String frontendUrl;

    public PasswordResetService(UserRepository userRepository, PasswordResetTokenRepository tokenRepository,
                                PasswordEncoder passwordEncoder, EmailSender emailSender,
                                @Qualifier("mailExecutor") Executor mailExecutor,
                                Clock clock, @Value("${app.frontend-url}") String frontendUrl) {
        this.userRepository = userRepository;
        this.tokenRepository = tokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailSender = emailSender;
        this.mailExecutor = mailExecutor;
        this.clock = clock;
        this.frontendUrl = frontendUrl.replaceAll("/+$", "");
    }

    /**
     * Emails a reset link if the account exists. Always completes the same way, and sends
     * the email asynchronously, so the response does not reveal whether the email is registered.
     */
    @Transactional
    public void requestReset(String email) {
        userRepository.findByEmailIgnoreCase(email).ifPresent(user -> {
            Instant now = clock.instant();
            tokenRepository.invalidateAllForUser(user.getId(), now);

            String rawToken = newToken();
            tokenRepository.save(new PasswordResetToken(user, sha256(rawToken), now.plus(TOKEN_TTL)));

            String to = user.getEmail();
            String text = """
                    Someone (hopefully you) asked to reset the password for your ApplyRec account.

                    Reset your password: %s/reset-password?token=%s

                    The link expires in %d minutes and can only be used once.
                    If you didn't ask for this, you can ignore this email; your password won't change.
                    """.formatted(frontendUrl, rawToken, TOKEN_TTL.toMinutes());
            // Send only after the token is committed, and off the request thread.
            afterCommit(() -> mailExecutor.execute(() -> emailSender.send(to, "Reset your ApplyRec password", text)));
        });
    }

    @Transactional
    public void resetPassword(String rawToken, String newPassword) {
        Instant now = clock.instant();
        PasswordResetToken token = tokenRepository.findByTokenHash(sha256(rawToken.trim()))
                .filter(t -> t.isUsable(now))
                .orElseThrow(() -> new BadRequestException(INVALID_LINK));

        User user = token.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        tokenRepository.invalidateAllForUser(user.getId(), now);
    }

    @Scheduled(cron = "0 17 3 * * *") // daily
    @Transactional
    public void purgeExpiredTokens() {
        tokenRepository.deleteExpiredBefore(clock.instant().minus(Duration.ofDays(1)));
    }

    private String newToken() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    static String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static void afterCommit(Runnable action) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    action.run();
                }
            });
        } else {
            action.run();
        }
    }
}
