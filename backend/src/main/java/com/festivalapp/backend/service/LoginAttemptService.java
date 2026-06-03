package com.festivalapp.backend.service;

import com.festivalapp.backend.exception.UnauthorizedException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class LoginAttemptService {

    private final Map<String, AttemptState> attempts = new ConcurrentHashMap<>();
    private final Clock clock;
    private final int maxFailures;
    private final Duration window;
    private final Duration lockDuration;

    @Autowired
    public LoginAttemptService(@Value("${security.login-attempts.max-failures:5}") int maxFailures,
                               @Value("${security.login-attempts.window-minutes:15}") long windowMinutes,
                               @Value("${security.login-attempts.lock-minutes:15}") long lockMinutes) {
        this(Clock.systemUTC(), maxFailures, windowMinutes, lockMinutes);
    }

    LoginAttemptService(Clock clock, int maxFailures, long windowMinutes, long lockMinutes) {
        this.clock = clock;
        this.maxFailures = Math.max(1, maxFailures);
        this.window = Duration.ofMinutes(Math.max(1, windowMinutes));
        this.lockDuration = Duration.ofMinutes(Math.max(1, lockMinutes));
    }

    public void assertAllowed(String identifier) {
        String key = normalize(identifier);
        AttemptState state = attempts.get(key);
        if (state == null) {
            return;
        }

        Instant now = Instant.now(clock);
        if (state.lockedUntil != null && state.lockedUntil.isAfter(now)) {
            throw new UnauthorizedException("Слишком много попыток входа. Повторите позже.");
        }
        if (state.lockedUntil != null || state.firstFailure.plus(window).isBefore(now)) {
            attempts.remove(key);
        }
    }

    public void recordFailure(String identifier) {
        String key = normalize(identifier);
        Instant now = Instant.now(clock);

        attempts.compute(key, (ignored, current) -> {
            AttemptState state = current;
            if (state == null || state.firstFailure.plus(window).isBefore(now)) {
                state = new AttemptState(now, 0, null);
            }

            int failures = state.failures + 1;
            Instant lockedUntil = failures >= maxFailures ? now.plus(lockDuration) : null;
            return new AttemptState(state.firstFailure, failures, lockedUntil);
        });
    }

    public void recordSuccess(String identifier) {
        attempts.remove(normalize(identifier));
    }

    private String normalize(String identifier) {
        if (!StringUtils.hasText(identifier)) {
            return "<empty>";
        }
        return identifier.trim().toLowerCase(Locale.ROOT);
    }

    private record AttemptState(Instant firstFailure, int failures, Instant lockedUntil) {
    }
}
