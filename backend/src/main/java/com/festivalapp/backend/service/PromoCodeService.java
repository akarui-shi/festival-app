package com.festivalapp.backend.service;

import com.festivalapp.backend.dto.PromoCodeCreateRequest;
import com.festivalapp.backend.dto.PromoCodeResponse;
import com.festivalapp.backend.dto.PromoCodeValidateResponse;
import com.festivalapp.backend.entity.Organization;
import com.festivalapp.backend.entity.PromoCode;
import com.festivalapp.backend.exception.BadRequestException;
import com.festivalapp.backend.exception.ResourceNotFoundException;
import com.festivalapp.backend.repository.OrganizationMemberRepository;
import com.festivalapp.backend.repository.OrganizationRepository;
import com.festivalapp.backend.repository.PromoCodeRepository;
import com.festivalapp.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PromoCodeService {

    private final PromoCodeRepository promoCodeRepository;
    private final OrganizationRepository organizationRepository;
    private final OrganizationMemberRepository organizationMemberRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<PromoCodeResponse> getByOrganizer(String actorIdentifier) {
        var user = userRepository.findByLoginOrEmailWithRoles(actorIdentifier)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        var memberships = organizationMemberRepository.findAllByUserIdAndLeftAtIsNull(user.getId());
        if (memberships.isEmpty()) return List.of();
        Long orgId = memberships.get(0).getOrganization().getId();
        return promoCodeRepository.findAllByOrganizationIdOrderByCreatedAtDesc(orgId)
            .stream().map(this::toResponse).toList();
    }

    @Transactional
    public PromoCodeResponse create(PromoCodeCreateRequest request, String actorIdentifier) {
        var user = userRepository.findByLoginOrEmailWithRoles(actorIdentifier)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        var memberships = organizationMemberRepository.findAllByUserIdAndLeftAtIsNull(user.getId());
        if (memberships.isEmpty()) throw new BadRequestException("Нет организации");
        Organization org = memberships.get(0).getOrganization();

        if (promoCodeRepository.findByCodeIgnoreCase(request.getCode()).isPresent()) {
            throw new BadRequestException("Промокод с таким кодом уже существует");
        }

        PromoCode promo = promoCodeRepository.save(PromoCode.builder()
            .code(request.getCode().toUpperCase().trim())
            .discountType(request.getDiscountType())
            .discountValue(request.getDiscountValue() != null ? request.getDiscountValue() : BigDecimal.ZERO)
            .maxUsages(request.getMaxUsages())
            .usageCount(0)
            .expiresAt(request.getExpiresAt())
            .organization(org)
            .active(true)
            .createdAt(OffsetDateTime.now())
            .build());
        return toResponse(promo);
    }

    @Transactional
    public void delete(Long id, String actorIdentifier) {
        var user = userRepository.findByLoginOrEmailWithRoles(actorIdentifier)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        PromoCode promo = promoCodeRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Промокод не найден"));
        boolean belongs = promo.getOrganization() != null &&
            organizationMemberRepository.existsByUserIdAndOrganizationIdAndLeftAtIsNull(
                user.getId(), promo.getOrganization().getId());
        if (!belongs) throw new BadRequestException("Недостаточно прав");
        promo.setActive(false);
        promoCodeRepository.save(promo);
    }

    @Transactional(readOnly = true)
    public PromoCodeValidateResponse validate(String code) {
        var promo = promoCodeRepository.findByCodeIgnoreCase(code)
            .orElse(null);
        if (promo == null || !promo.isActive()) {
            return PromoCodeValidateResponse.builder().valid(false).build();
        }
        if (promo.getExpiresAt() != null && promo.getExpiresAt().isBefore(OffsetDateTime.now())) {
            return PromoCodeValidateResponse.builder().valid(false).build();
        }
        if (promo.getMaxUsages() != null && promo.getUsageCount() >= promo.getMaxUsages()) {
            return PromoCodeValidateResponse.builder().valid(false).build();
        }
        String desc = buildDescription(promo);
        return PromoCodeValidateResponse.builder()
            .valid(true)
            .discountType(promo.getDiscountType())
            .discountValue(promo.getDiscountValue())
            .description(desc)
            .build();
    }

    public BigDecimal applyDiscount(String code, BigDecimal total) {
        if (code == null || code.isBlank()) return total;
        var promo = promoCodeRepository.findByCodeIgnoreCase(code).orElse(null);
        if (promo == null || !promo.isActive()) return total;
        if (promo.getExpiresAt() != null && promo.getExpiresAt().isBefore(OffsetDateTime.now())) return total;
        if (promo.getMaxUsages() != null && promo.getUsageCount() >= promo.getMaxUsages()) return total;

        BigDecimal discounted;
        switch (promo.getDiscountType()) {
            case "FREE" -> discounted = BigDecimal.ZERO;
            case "PERCENT" -> {
                BigDecimal pct = promo.getDiscountValue().divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
                discounted = total.subtract(total.multiply(pct)).setScale(2, RoundingMode.HALF_UP);
            }
            case "FIXED" -> discounted = total.subtract(promo.getDiscountValue()).max(BigDecimal.ZERO);
            default -> discounted = total;
        }

        promo.setUsageCount(promo.getUsageCount() + 1);
        promoCodeRepository.save(promo);
        return discounted;
    }

    private String buildDescription(PromoCode promo) {
        return switch (promo.getDiscountType()) {
            case "FREE" -> "Бесплатно";
            case "PERCENT" -> "Скидка " + promo.getDiscountValue().stripTrailingZeros().toPlainString() + "%";
            case "FIXED" -> "Скидка " + promo.getDiscountValue().stripTrailingZeros().toPlainString() + " ₽";
            default -> "";
        };
    }

    private PromoCodeResponse toResponse(PromoCode p) {
        return PromoCodeResponse.builder()
            .id(p.getId())
            .code(p.getCode())
            .discountType(p.getDiscountType())
            .discountValue(p.getDiscountValue())
            .maxUsages(p.getMaxUsages())
            .usageCount(p.getUsageCount())
            .expiresAt(p.getExpiresAt())
            .active(p.isActive())
            .createdAt(p.getCreatedAt())
            .build();
    }
}
