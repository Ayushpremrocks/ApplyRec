package com.applyrec.controller;

import com.applyrec.dto.AuthDtos.AuthResponse;
import com.applyrec.dto.AuthDtos.ForgotPasswordRequest;
import com.applyrec.dto.AuthDtos.LoginRequest;
import com.applyrec.dto.AuthDtos.MessageResponse;
import com.applyrec.dto.AuthDtos.ResetPasswordRequest;
import com.applyrec.dto.AuthDtos.SignupRequest;
import com.applyrec.exception.UnauthorizedException;
import com.applyrec.security.RateLimiter;
import com.applyrec.service.AuthService;
import com.applyrec.service.PasswordResetService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;

/**
 * Brute-force protection: failed logins are limited per email (not spoofable by rotating
 * IPs), and every auth endpoint is additionally limited per client IP.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    static final String TOO_MANY = "Too many attempts. Please wait a few minutes and try again.";
    static final Duration LOGIN_FAILURE_WINDOW = Duration.ofMinutes(15);

    private final AuthService authService;
    private final PasswordResetService passwordResetService;
    private final RateLimiter rateLimiter;
    private final int loginFailuresPerEmail;
    private final int loginPerIp;
    private final int signupPerIp;
    private final int resetPerIp;

    public AuthController(
            AuthService authService,
            PasswordResetService passwordResetService,
            RateLimiter rateLimiter,
            @Value("${app.rate-limit.login-failures-per-email:5}") int loginFailuresPerEmail,
            @Value("${app.rate-limit.login-per-ip:30}") int loginPerIp,
            @Value("${app.rate-limit.signup-per-ip:10}") int signupPerIp,
            @Value("${app.rate-limit.password-reset-per-ip:10}") int resetPerIp
    ) {
        this.authService = authService;
        this.passwordResetService = passwordResetService;
        this.rateLimiter = rateLimiter;
        this.loginFailuresPerEmail = loginFailuresPerEmail;
        this.loginPerIp = loginPerIp;
        this.signupPerIp = signupPerIp;
        this.resetPerIp = resetPerIp;
    }

    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse signup(@Valid @RequestBody SignupRequest request, HttpServletRequest http) {
        rateLimiter.hit("signup:ip:" + http.getRemoteAddr(), signupPerIp, Duration.ofHours(1), TOO_MANY);
        return authService.signup(request.email(), request.password());
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest http) {
        rateLimiter.hit("login:ip:" + http.getRemoteAddr(), loginPerIp, Duration.ofMinutes(10), TOO_MANY);

        String failureKey = "login:fail:" + AuthService.normalizeEmail(request.email());
        rateLimiter.check(failureKey, loginFailuresPerEmail, LOGIN_FAILURE_WINDOW,
                "Too many failed sign-in attempts. Please wait 15 minutes or reset your password.");
        try {
            AuthResponse response = authService.login(request.email(), request.password());
            rateLimiter.reset(failureKey);
            return response;
        } catch (UnauthorizedException ex) {
            rateLimiter.record(failureKey, LOGIN_FAILURE_WINDOW);
            throw ex;
        }
    }

    @PostMapping("/forgot-password")
    public MessageResponse forgotPassword(@Valid @RequestBody ForgotPasswordRequest request, HttpServletRequest http) {
        rateLimiter.hit("forgot:ip:" + http.getRemoteAddr(), resetPerIp, Duration.ofMinutes(15), TOO_MANY);
        String email = AuthService.normalizeEmail(request.email());
        rateLimiter.hit("forgot:email:" + email, 3, Duration.ofHours(1), TOO_MANY);
        passwordResetService.requestReset(email);
        return new MessageResponse("If an account exists for that email, we've sent a password reset link.");
    }

    @PostMapping("/reset-password")
    public MessageResponse resetPassword(@Valid @RequestBody ResetPasswordRequest request, HttpServletRequest http) {
        rateLimiter.hit("reset:ip:" + http.getRemoteAddr(), resetPerIp * 2, Duration.ofMinutes(15), TOO_MANY);
        passwordResetService.resetPassword(request.token(), request.password());
        return new MessageResponse("Your password has been reset. You can sign in now.");
    }
}
