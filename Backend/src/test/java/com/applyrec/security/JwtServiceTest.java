package com.applyrec.security;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private static final String SECRET = "test-secret-that-is-definitely-32-bytes-long";

    @Test
    void rejectsShortSecret() {
        assertThatThrownBy(() -> new JwtService("change-me", 7))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("at least 32 bytes");
    }

    @Test
    void roundTripsUserId() {
        JwtService jwt = new JwtService(SECRET, 7);
        assertThat(jwt.parseUserId(jwt.generateToken(42L))).contains(42L);
    }

    @Test
    void rejectsTokenSignedWithDifferentSecret() {
        String token = new JwtService(SECRET + "-other", 7).generateToken(1L);
        assertThat(new JwtService(SECRET, 7).parseUserId(token)).isEmpty();
    }

    @Test
    void rejectsGarbageAndExpiredTokens() {
        JwtService jwt = new JwtService(SECRET, 7);
        assertThat(jwt.parseUserId("not-a-jwt")).isEmpty();
        String expired = new JwtService(SECRET, -1).generateToken(1L);
        assertThat(jwt.parseUserId(expired)).isEmpty();
    }
}
