package com.festivalapp.backend.service;

import com.festivalapp.backend.dto.AuthResponse;
import com.festivalapp.backend.entity.City;
import com.festivalapp.backend.entity.Role;
import com.festivalapp.backend.entity.RoleName;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.entity.UserRole;
import com.festivalapp.backend.exception.BadRequestException;
import com.festivalapp.backend.exception.UnauthorizedException;
import com.festivalapp.backend.repository.CityRepository;
import com.festivalapp.backend.repository.RoleRepository;
import com.festivalapp.backend.repository.UserRepository;
import com.festivalapp.backend.repository.UserRoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.OffsetDateTime;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SocialAuthService {

    private static final BCryptPasswordEncoder SOCIAL_PASSWORD_ENCODER = new BCryptPasswordEncoder();

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final CityRepository cityRepository;
    @Lazy
    private final AuthService authService;

    @Transactional
    public AuthResponse loginWithOAuth2(OAuth2AuthenticationToken authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            throw new UnauthorizedException("Не удалось выполнить вход через внешнего провайдера");
        }

        String provider = normalizeProvider(authentication.getAuthorizedClientRegistrationId());
        OAuth2User principal = authentication.getPrincipal();
        ExternalProfile profile = extractProfile(provider, principal.getAttributes());

        String baseLogin = buildBaseLogin(provider, profile.providerUserId());
        String normalizedEmail = normalizeEmail(profile.email());
        String effectiveEmail = normalizedEmail != null ? normalizedEmail : (baseLogin + "@oauth.local");

        User user = findExistingUser(effectiveEmail, baseLogin).orElseGet(() -> createUser(
            baseLogin,
            effectiveEmail,
            profile.firstName(),
            profile.lastName()
        ));

        if (!user.isActive()) {
            throw new UnauthorizedException("Учетная запись заблокирована");
        }

        updateProfileIfBlank(user, profile.firstName(), profile.lastName());
        ensureResidentRole(user);

        user.setLastLoginAt(OffsetDateTime.now());
        user.setUpdatedAt(OffsetDateTime.now());

        User saved = userRepository.save(user);
        return authService.issueAuthResponse(saved);
    }

    private Optional<User> findExistingUser(String email, String login) {
        Optional<User> byEmail = userRepository.findByLoginOrEmailWithRoles(email);
        if (byEmail.isPresent()) {
            return byEmail;
        }
        return userRepository.findByLoginOrEmailWithRoles(login);
    }

    private User createUser(String baseLogin, String email, String firstName, String lastName) {
        OffsetDateTime now = OffsetDateTime.now();
        String login = generateUniqueLogin(baseLogin);

        return userRepository.save(User.builder()
            .login(login)
            .email(email)
            .phone(null)
            .passwordHash(SOCIAL_PASSWORD_ENCODER.encode(UUID.randomUUID().toString()))
            .firstName(resolveFirstName(firstName, login))
            .lastName(resolveLastName(lastName))
            .registeredAt(now)
            .lastLoginAt(now)
            .active(true)
            .city(resolveDefaultCity())
            .createdAt(now)
            .updatedAt(now)
            .build());
    }

    private void updateProfileIfBlank(User user, String firstName, String lastName) {
        String normalizedFirstName = normalizeOptional(firstName);
        String normalizedLastName = normalizeOptional(lastName);

        if ((!StringUtils.hasText(user.getFirstName()) || "Пользователь".equalsIgnoreCase(user.getFirstName()))
            && StringUtils.hasText(normalizedFirstName)) {
            user.setFirstName(normalizedFirstName);
        }
        if ((!StringUtils.hasText(user.getLastName()) || "Пользователь".equalsIgnoreCase(user.getLastName()))
            && StringUtils.hasText(normalizedLastName)) {
            user.setLastName(normalizedLastName);
        }
    }

    private void ensureResidentRole(User user) {
        boolean hasResidentRole = user.getUserRoles().stream()
            .anyMatch(userRole -> userRole.getRole().toRoleName() == RoleName.ROLE_RESIDENT);
        if (hasResidentRole) {
            return;
        }

        Role residentRole = roleRepository.findByName(RoleName.ROLE_RESIDENT)
            .orElseGet(() -> roleRepository.save(Role.builder()
                .name(RoleName.ROLE_RESIDENT.toDbName())
                .description("Системная роль")
                .build()));

        UserRole userRole = userRoleRepository.save(UserRole.builder()
            .user(user)
            .role(residentRole)
            .assignedAt(OffsetDateTime.now())
            .build());
        user.getUserRoles().add(userRole);
    }

    private City resolveDefaultCity() {
        return cityRepository.findFirstByNameIgnoreCase("Коломна")
            .or(() -> cityRepository.findAllByOrderByNameAsc().stream().findFirst())
            .orElseThrow(() -> new BadRequestException("В системе не настроены города"));
    }

    private String generateUniqueLogin(String baseLogin) {
        String candidate = baseLogin;
        int suffix = 1;
        while (userRepository.existsByLogin(candidate)) {
            candidate = baseLogin + "_" + suffix++;
        }
        return candidate;
    }

    private String buildBaseLogin(String provider, String providerUserId) {
        String normalizedProvider = normalizeToken(provider);
        String normalizedUserId = normalizeToken(providerUserId);
        String combined = normalizedProvider + "_" + normalizedUserId;
        if (combined.length() < 3) {
            return (combined + "user").substring(0, 4);
        }
        return combined;
    }

    private String normalizeProvider(String value) {
        if (!StringUtils.hasText(value)) {
            throw new UnauthorizedException("Провайдер OAuth2 не определен");
        }
        return value.trim().toLowerCase(Locale.ROOT);
    }

    private ExternalProfile extractProfile(String provider, Map<String, Object> attributes) {
        Map<String, Object> nestedUser = asMap(attributes.get("user"));
        String providerUserId = firstNotBlank(
            stringValue(nestedUser.get("user_id")),
            stringValue(nestedUser.get("id")),
            stringValue(attributes.get("user_id")),
            stringValue(attributes.get("id")),
            stringValue(attributes.get("sub"))
        );
        if (!StringUtils.hasText(providerUserId)) {
            throw new UnauthorizedException("Не удалось определить идентификатор пользователя " + provider);
        }

        String email = firstNotBlank(
            stringValue(nestedUser.get("email")),
            stringValue(attributes.get("email")),
            stringValue(attributes.get("default_email"))
        );
        String firstName = firstNotBlank(
            stringValue(nestedUser.get("first_name")),
            stringValue(attributes.get("first_name")),
            stringValue(attributes.get("given_name"))
        );
        String lastName = firstNotBlank(
            stringValue(nestedUser.get("last_name")),
            stringValue(attributes.get("last_name")),
            stringValue(attributes.get("family_name"))
        );

        if (!StringUtils.hasText(firstName) || !StringUtils.hasText(lastName)) {
            String fullName = firstNotBlank(
                stringValue(attributes.get("real_name")),
                stringValue(attributes.get("name"))
            );
            if (StringUtils.hasText(fullName)) {
                String[] parts = fullName.trim().split("\\s+");
                if (!StringUtils.hasText(firstName) && parts.length > 0) {
                    firstName = parts[0];
                }
                if (!StringUtils.hasText(lastName) && parts.length > 1) {
                    lastName = parts[parts.length - 1];
                }
            }
        }

        return new ExternalProfile(providerUserId, email, firstName, lastName);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> asMap(Object value) {
        if (value instanceof Map<?, ?> map) {
            return (Map<String, Object>) map;
        }
        return Map.of();
    }

    private String normalizeEmail(String email) {
        String normalized = normalizeOptional(email);
        return normalized == null ? null : normalized.toLowerCase(Locale.ROOT);
    }

    private String resolveFirstName(String firstName, String fallbackLogin) {
        String normalized = normalizeOptional(firstName);
        if (normalized != null) {
            return normalized;
        }
        return "Пользователь";
    }

    private String resolveLastName(String lastName) {
        String normalized = normalizeOptional(lastName);
        if (normalized != null) {
            return normalized;
        }
        return "Пользователь";
    }

    private String normalizeToken(String value) {
        if (!StringUtils.hasText(value)) {
            return "user";
        }
        String normalized = value.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9_]", "_");
        normalized = normalized.replaceAll("_+", "_");
        normalized = normalized.replaceAll("^_+|_+$", "");
        return normalized.isBlank() ? "user" : normalized;
    }

    private String normalizeOptional(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }

    private String stringValue(Object value) {
        if (value == null) {
            return null;
        }
        return String.valueOf(value);
    }

    private String firstNotBlank(String... values) {
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                return value.trim();
            }
        }
        return null;
    }

    private record ExternalProfile(String providerUserId, String email, String firstName, String lastName) {
    }
}
