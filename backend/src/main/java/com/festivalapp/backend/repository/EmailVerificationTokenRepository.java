package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.EmailVerificationPurpose;
import com.festivalapp.backend.entity.EmailVerificationToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, Long> {

    Optional<EmailVerificationToken> findByToken(String token);

    List<EmailVerificationToken> findAllByUserIdAndPurposeAndUsedAtIsNull(Long userId, EmailVerificationPurpose purpose);
}
