package com.applyrec.security;

import com.applyrec.exception.TooManyRequestsException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory sliding-window rate limiter. State is per instance, which is fine for a single
 * Render instance; move to Redis if the backend is ever scaled horizontally.
 */
@Component
public class RateLimiter {

    /** Entries idle for longer than this are dropped by {@link #evictIdle()}. */
    static final Duration MAX_WINDOW = Duration.ofHours(2);

    private final Map<String, Deque<Long>> hits = new ConcurrentHashMap<>();
    private final Clock clock;

    public RateLimiter(Clock clock) {
        this.clock = clock;
    }

    /** Records an attempt and rejects it if the key already used its {@code limit} in {@code window}. */
    public void hit(String key, int limit, Duration window, String message) {
        long now = clock.millis();
        Deque<Long> q = hits.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (q) {
            prune(q, now, window);
            if (q.size() >= limit) {
                throw tooMany(q, now, window, message);
            }
            q.addLast(now);
        }
    }

    /** Rejects if the key has reached the limit, without recording anything. */
    public void check(String key, int limit, Duration window, String message) {
        Deque<Long> q = hits.get(key);
        if (q == null) return;
        long now = clock.millis();
        synchronized (q) {
            prune(q, now, window);
            if (q.size() >= limit) {
                throw tooMany(q, now, window, message);
            }
        }
    }

    /** Records an event (e.g. a failed login) without enforcing a limit. */
    public void record(String key, Duration window) {
        long now = clock.millis();
        Deque<Long> q = hits.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (q) {
            prune(q, now, window);
            q.addLast(now);
        }
    }

    public void reset(String key) {
        hits.remove(key);
    }

    @Scheduled(fixedDelay = 10 * 60 * 1000)
    public void evictIdle() {
        long cutoff = clock.millis() - MAX_WINDOW.toMillis();
        hits.entrySet().removeIf(e -> {
            synchronized (e.getValue()) {
                Long newest = e.getValue().peekLast();
                return newest == null || newest < cutoff;
            }
        });
    }

    int trackedKeys() {
        return hits.size();
    }

    private static void prune(Deque<Long> q, long now, Duration window) {
        long cutoff = now - window.toMillis();
        while (!q.isEmpty() && q.peekFirst() <= cutoff) {
            q.pollFirst();
        }
    }

    private static TooManyRequestsException tooMany(Deque<Long> q, long now, Duration window, String message) {
        long retryAfterMs = q.peekFirst() + window.toMillis() - now;
        return new TooManyRequestsException(message, (retryAfterMs + 999) / 1000);
    }
}
