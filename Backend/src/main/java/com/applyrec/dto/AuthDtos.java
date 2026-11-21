package com.applyrec.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class AuthDtos {

    private AuthDtos() {
    }

    /** BCrypt only uses the first 72 bytes of a password, hence the upper bound. */
    public record SignupRequest(
            @Email @NotBlank @Size(max = 255) String email,
            @NotBlank @Size(min = 6, max = 72, message = "must be between 6 and 72 characters") String password
    ) {
    }

    public record LoginRequest(
            @NotBlank String email,
            @NotBlank String password
    ) {
    }

    public record ForgotPasswordRequest(
            @Email @NotBlank @Size(max = 255) String email
    ) {
    }

    public record ResetPasswordRequest(
            @NotBlank @Size(max = 200) String token,
            @NotBlank @Size(min = 6, max = 72, message = "must be between 6 and 72 characters") String password
    ) {
    }

    public record AuthResponse(String message, UserInfo user, String token) {
    }

    public record UserInfo(Long id, String email) {
    }

    public record MessageResponse(String message) {
    }
}
