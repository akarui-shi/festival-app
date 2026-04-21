package com.festivalapp.backend.service;

import com.festivalapp.backend.dto.AuthResponse;
import com.festivalapp.backend.dto.CurrentUserResponse;
import com.festivalapp.backend.dto.LoginRequest;
import com.festivalapp.backend.dto.RegisterRequest;
import com.festivalapp.backend.entity.City;
import com.festivalapp.backend.entity.Organization;
import com.festivalapp.backend.entity.OrganizationMember;
import com.festivalapp.backend.entity.OrganizationJoinRequest;
import com.festivalapp.backend.entity.Role;
import com.festivalapp.backend.entity.RoleName;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.entity.UserRole;
import com.festivalapp.backend.exception.BadRequestException;
import com.festivalapp.backend.exception.UnauthorizedException;
import com.festivalapp.backend.repository.CityRepository;
import com.festivalapp.backend.repository.OrganizationMemberRepository;
import com.festivalapp.backend.repository.OrganizationJoinRequestRepository;
import com.festivalapp.backend.repository.OrganizationRepository;
import com.festivalapp.backend.repository.RoleRepository;
import com.festivalapp.backend.repository.UserRepository;
import com.festivalapp.backend.repository.UserRoleRepository;
import com.festivalapp.backend.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final OrganizationRepository organizationRepository;
    private final OrganizationMemberRepository organizationMemberRepository;
    private final OrganizationJoinRequestRepository organizationJoinRequestRepository;
    private final UserRoleRepository userRoleRepository;
    private final CityRepository cityRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String normalizedLogin = normalizeRequired(request.getLogin(), "Введите логин");
        String normalizedEmail = normalizeRequired(request.getEmail(), "Введите электронную почту");
        String normalizedPhone = normalizeOptional(request.getPhone());
        RoleName requestedRole = resolveRegistrationRole(request.getRole());

        if (userRepository.existsByLogin(normalizedLogin)) {
            throw new BadRequestException("Логин уже занят");
        }
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new BadRequestException("Электронная почта уже используется");
        }
        if (normalizedPhone != null && userRepository.existsByPhone(normalizedPhone)) {
            throw new BadRequestException("Пользователь с таким номером телефона уже существует");
        }

        OffsetDateTime now = OffsetDateTime.now();

        User user = User.builder()
            .login(normalizedLogin)
            .email(normalizedEmail)
            .phone(normalizedPhone)
            .passwordHash(passwordEncoder.encode(request.getPassword()))
            .firstName(defaultName(request.getFirstName(), normalizedLogin))
            .lastName(defaultName(request.getLastName(), "Пользователь"))
            .registeredAt(now)
            .active(true)
            .createdAt(now)
            .updatedAt(now)
            .city(resolveDefaultCity())
            .build();

        User savedUser = userRepository.save(user);
        RoleName assignedRole = requestedRole;
        if (requestedRole == RoleName.ROLE_ORGANIZER && request.getOrganizationId() != null) {
            // User asked to join an existing organization.
            // Organizer role is granted only after owner/admin approval of the join request.
            assignedRole = RoleName.ROLE_RESIDENT;
        }

        Role role = resolveRole(assignedRole);
        UserRole userRole = userRoleRepository.save(UserRole.builder()
            .user(savedUser)
            .role(role)
            .assignedAt(now)
            .build());
        savedUser.getUserRoles().add(userRole);

        if (requestedRole == RoleName.ROLE_ORGANIZER) {
            if (request.getOrganizationId() != null) {
                Organization organization = organizationRepository.findByIdAndDeletedAtIsNull(request.getOrganizationId())
                    .orElseThrow(() -> new BadRequestException("Организация не найдена"));

                organizationJoinRequestRepository.save(OrganizationJoinRequest.builder()
                    .user(savedUser)
                    .organization(organization)
                    .message(normalizeOptional(request.getJoinRequestMessage()))
                    .status("pending")
                    .requestedAt(now)
                    .build());
            } else {
                String companyName = normalizeRequired(request.getCompanyName(), "Введите название компании");
                Organization organization = ensureOrganization(companyName, savedUser, now);
                organizationMemberRepository.save(OrganizationMember.builder()
                    .user(savedUser)
                    .organization(organization)
                    .organizationStatus("владелец")
                    .joinedAt(now)
                    .build());
            }
        }

        return issueAuthResponse(savedUser);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByLoginOrEmailWithRoles(request.getLoginOrEmail())
            .orElseThrow(() -> new UnauthorizedException("Неверный логин/email или пароль"));

        if (!user.isActive()) {
            throw new UnauthorizedException("Учетная запись заблокирована");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new UnauthorizedException("Неверный логин/email или пароль");
        }

        user.setLastLoginAt(OffsetDateTime.now());
        user.setUpdatedAt(OffsetDateTime.now());
        userRepository.save(user);

        return issueAuthResponse(user);
    }

    public AuthResponse issueAuthResponse(User user) {
        return AuthResponse.builder()
            .token(jwtService.generateToken(user.getLogin()))
            .user(toCurrentUserResponse(user))
            .build();
    }

    private Role resolveRole(RoleName roleName) {
        return roleRepository.findByName(roleName)
            .orElseGet(() -> roleRepository.save(Role.builder()
                .name(roleName.toDbName())
                .description("Системная роль")
                .build()));
    }

    private Organization ensureOrganization(String companyName, User user, OffsetDateTime now) {
        return organizationRepository.findByNameIgnoreCase(companyName)
            .orElseGet(() -> organizationRepository.save(Organization.builder()
                .name(companyName)
                .description("Профиль организации")
                .city(resolveDefaultCity())
                .contactEmail(user.getEmail())
                .contactPhone(user.getPhone())
                .moderationStatus("на_рассмотрении")
                .createdAt(now)
                .updatedAt(now)
                .build()));
    }

    private City resolveDefaultCity() {
        return cityRepository.findFirstByNameIgnoreCase("Коломна")
            .orElseGet(() -> cityRepository.findAllByOrderByNameAsc().stream().findFirst()
                .orElseThrow(() -> new BadRequestException("В системе не настроены города")));
    }

    public CurrentUserResponse toCurrentUserResponse(User user) {
        Set<String> roles = user.getUserRoles().stream()
            .map(userRole -> userRole.getRole().toRoleName().toApiName())
            .collect(Collectors.toSet());

        Optional<OrganizationMember> primaryMembership = findPrimaryMembership(user.getId());

        return CurrentUserResponse.builder()
            .id(user.getId())
            .login(user.getLogin())
            .email(user.getEmail())
            .phone(user.getPhone())
            .firstName(user.getFirstName())
            .lastName(user.getLastName())
            .avatarImageId(user.getAvatarImage() == null ? null : user.getAvatarImage().getId())
            .roles(roles)
            .organization(primaryMembership.map(this::toOrganizationInfo).orElse(null))
            .build();
    }

    private Optional<OrganizationMember> findPrimaryMembership(Long userId) {
        List<OrganizationMember> memberships = organizationMemberRepository.findAllByUserIdAndLeftAtIsNull(userId);
        if (memberships.isEmpty()) {
            return Optional.empty();
        }

        return memberships.stream()
            .sorted(Comparator
                .comparingInt((OrganizationMember item) -> statusPriority(item.getOrganizationStatus()))
                .thenComparing(OrganizationMember::getJoinedAt, Comparator.nullsLast(Comparator.naturalOrder())))
            .findFirst();
    }

    private int statusPriority(String status) {
        if (status == null) {
            return 99;
        }
        return switch (status.trim().toLowerCase(Locale.ROOT)) {
            case "владелец" -> 0;
            case "администратор" -> 1;
            case "участник" -> 2;
            default -> 10;
        };
    }

    private CurrentUserResponse.OrganizationInfo toOrganizationInfo(OrganizationMember membership) {
        Organization organization = membership.getOrganization();
        return CurrentUserResponse.OrganizationInfo.builder()
            .id(organization.getId())
            .name(organization.getName())
            .description(organization.getDescription())
            .contacts(organization.getContacts())
            .build();
    }

    private RoleName resolveRegistrationRole(String rawRole) {
        if (!StringUtils.hasText(rawRole)) {
            return RoleName.ROLE_RESIDENT;
        }

        RoleName parsedRole;
        try {
            parsedRole = RoleName.fromAny(rawRole);
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Недопустимая роль при регистрации: " + rawRole);
        }

        if (parsedRole == RoleName.ROLE_ADMIN) {
            throw new BadRequestException("Нельзя зарегистрироваться с ролью администратора");
        }

        return parsedRole;
    }

    private String defaultName(String value, String fallback) {
        String normalized = normalizeOptional(value);
        if (normalized != null) {
            return normalized;
        }
        return fallback;
    }

    private String normalizeRequired(String value, String message) {
        if (!StringUtils.hasText(value)) {
            throw new BadRequestException(message);
        }
        return value.trim();
    }

    private String normalizeOptional(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }
}
