package com.applyrec.controller;

import com.applyrec.config.CorsConfig;
import com.applyrec.config.SecurityConfig;
import com.applyrec.config.TimeConfig;
import com.applyrec.security.RateLimiter;
import com.applyrec.service.PasswordResetService;
import com.applyrec.exception.ConflictException;
import com.applyrec.exception.UnauthorizedException;
import com.applyrec.security.JwtAuthenticationFilter;
import com.applyrec.security.JwtService;
import com.applyrec.service.AuthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@Import({SecurityConfig.class, CorsConfig.class, JwtAuthenticationFilter.class, JwtService.class,
        RateLimiter.class, TimeConfig.class})
@TestPropertySource(properties = {
        "app.jwt.secret=test-secret-that-is-definitely-32-bytes-long",
        "app.cors.allowed-origins=http://localhost:5173"
})
class AuthControllerTest {

    @Autowired
    MockMvc mvc;
    @MockBean
    AuthService authService;
    @MockBean
    PasswordResetService passwordResetService;

    @Test
    void duplicateEmailReturns409() throws Exception {
        when(authService.signup(any(), any())).thenThrow(new ConflictException("Email already registered"));
        mvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"a@b.com\",\"password\":\"secret1\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("Email already registered"));
    }

    @Test
    void shortPasswordReturns400() throws Exception {
        mvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"a@b.com\",\"password\":\"123\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", containsString("password")));
    }

    @Test
    void invalidEmailReturns400NotEmpty403() throws Exception {
        mvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"not-an-email\",\"password\":\"secret1\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", containsString("email")));
    }

    @Test
    void badCredentialsReturn401() throws Exception {
        when(authService.login(any(), any())).thenThrow(new UnauthorizedException("Invalid email or password"));
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"a@b.com\",\"password\":\"wrong\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Invalid email or password"));
    }

    @Test
    void repeatedFailedLoginsAreRateLimitedPerEmail() throws Exception {
        when(authService.login(any(), any())).thenThrow(new UnauthorizedException("Invalid email or password"));
        String body = "{\"email\":\"victim@example.com\",\"password\":\"guess\"}";
        for (int i = 0; i < 5; i++) {
            mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isUnauthorized());
        }
        // Same email in a different case is the same account.
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(body.replace("victim", "VICTIM")))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"))
                .andExpect(jsonPath("$.error").value(containsString("Too many failed sign-in attempts")));

        // Other accounts are unaffected.
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"someone@example.com\",\"password\":\"guess\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void forgotPasswordAlwaysReturnsTheSameMessage() throws Exception {
        mvc.perform(post("/api/auth/forgot-password").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"nobody@example.com\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value(containsString("If an account exists")));
        verify(passwordResetService).requestReset("nobody@example.com");
    }

    @Test
    void resetPasswordValidatesLength() throws Exception {
        mvc.perform(post("/api/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"abc\",\"password\":\"123\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value(containsString("password")));
    }
}
