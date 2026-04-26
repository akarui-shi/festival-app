package com.festivalapp.backend.repository;

import com.festivalapp.backend.entity.PromoCode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PromoCodeRepository extends JpaRepository<PromoCode, Long> {

    Optional<PromoCode> findByCodeIgnoreCase(String code);

    List<PromoCode> findAllByOrganizationIdOrderByCreatedAtDesc(Long organizationId);
}
