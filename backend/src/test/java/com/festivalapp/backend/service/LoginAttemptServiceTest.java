package com.festivalapp.backend.service;

import com.festivalapp.backend.exception.UnauthorizedException;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LoginAttemptServiceTest {

    @Test
    void recordFailure_locksIdentifierAfterLimit() {
        LoginAttemptService service = new LoginAttemptService(
            Clock.fixed(Instant.parse("2026-06-02T10:00:00Z"), ZoneOffset.UTC),
            3,
            15,
            15
        );

        service.recordFailure("Alice@example.com");
        service.recordFailure("alice@example.com");
        assertThatCode(() -> service.assertAllowed(" ALICE@example.com ")).doesNotThrowAnyException();

        service.recordFailure("alice@example.com");

        assertThatThrownBy(() -> service.assertAllowed("alice@example.com"))
            .isInstanceOf(UnauthorizedException.class)
            .hasMessageContaining("Слишком много попыток");
    }

    @Test
    void recordSuccess_clearsFailures() {
        LoginAttemptService service = new LoginAttemptService(
            Clock.fixed(Instant.parse("2026-06-02T10:00:00Z"), ZoneOffset.UTC),
            2,
            15,
            15
        );

        service.recordFailure("alice");
        service.recordSuccess("alice");

        assertThatCode(() -> service.assertAllowed("alice")).doesNotThrowAnyException();
    }
}
