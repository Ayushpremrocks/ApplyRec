package com.applyrec.security;

import com.applyrec.exception.TooManyRequestsException;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RateLimiterTest {

    /** A clock the test can move forward. */
    static final class MutableClock extends Clock {
        Instant now = Instant.parse("2025-01-01T00:00:00Z");

        @Override public ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(ZoneId zone) { return this; }
        @Override public Instant instant() { return now; }
        void advance(Duration d) { now = now.plus(d); }
    }

    private final MutableClock clock = new MutableClock();
    private final RateLimiter limiter = new RateLimiter(clock);
    private static final Duration MINUTE = Duration.ofMinutes(1);

    @Test
    void allowsUpToTheLimitThenRejectsWithRetryAfter() {
        for (int i = 0; i < 3; i++) {
            limiter.hit("k", 3, MINUTE, "slow down");
            clock.advance(Duration.ofSeconds(10));
        }
        assertThatThrownBy(() -> limiter.hit("k", 3, MINUTE, "slow down"))
                .isInstanceOf(TooManyRequestsException.class)
                .hasMessage("slow down")
                .extracting(e -> ((TooManyRequestsException) e).getRetryAfterSeconds())
                .isEqualTo(30L); // first hit at t=0 expires at t=60; now t=30
    }

    @Test
    void windowSlides() {
        limiter.hit("k", 1, MINUTE, "x");
        clock.advance(Duration.ofSeconds(61));
        assertThatCode(() -> limiter.hit("k", 1, MINUTE, "x")).doesNotThrowAnyException();
    }

    @Test
    void checkAndRecordTrackFailuresSeparatelyFromHits() {
        limiter.check("fail", 2, MINUTE, "x"); // nothing recorded yet
        limiter.record("fail", MINUTE);
        limiter.check("fail", 2, MINUTE, "x");
        limiter.record("fail", MINUTE);
        assertThatThrownBy(() -> limiter.check("fail", 2, MINUTE, "x")).isInstanceOf(TooManyRequestsException.class);

        limiter.reset("fail");
        assertThatCode(() -> limiter.check("fail", 2, MINUTE, "x")).doesNotThrowAnyException();
    }

    @Test
    void evictsIdleKeys() {
        limiter.hit("a", 5, MINUTE, "x");
        clock.advance(RateLimiter.MAX_WINDOW.plusMinutes(1));
        limiter.hit("b", 5, MINUTE, "x");
        limiter.evictIdle();
        assertThat(limiter.trackedKeys()).isEqualTo(1);
    }
}
