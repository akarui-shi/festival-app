package com.festivalapp.backend.service;

import com.festivalapp.backend.dto.AuthResponse;
import com.festivalapp.backend.dto.CurrentUserResponse;
import com.festivalapp.backend.dto.LoginRequest;
import com.festivalapp.backend.dto.RegisterRequest;
import com.festivalapp.backend.entity.Organization;
import com.festivalapp.backend.entity.Organizer;
import com.festivalapp.backend.entity.Role;
import com.festivalapp.backend.entity.RoleName;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.entity.UserRole;
import com.festivalapp.backend.entity.UserRoleId;
import com.festivalapp.backend.entity.UserStatus;
import com.festivalapp.backend.exception.BadRequestException;
import com.festivalapp.backend.exception.UnauthorizedException;
import com.festivalapp.backend.repository.OrganizationRepository;
import com.festivalapp.backend.repository.OrganizerRepository;
import com.festivalapp.backend.repository.RoleRepository;
import com.festivalapp.backend.repository.UserRepository;
import com.festivalapp.backend.repository.UserRoleRepository;
import com.festivalapp.backend.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final OrganizationRepository organizationRepository;
    private final OrganizerRepository organizerRepository;
    private final UserRoleRepository userRoleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String normalizedLogin = normalizeRequired(request.getLogin(), "Введите логин");
        String normalizedEmail = normalizeRequired(request.getEmail(), "Введите электронную почту");
        String normalizedPhone = normalizeOptional(request.getPhone());
        RoleName requestedRoleName = resolveRegistrationRole(request.getRole());
        String normalizedCompanyName = normalizeOptional(request.getCompanyName());

        if (userRepository.existsByLogin(normalizedLogin)) {
            throw new BadRequestException("Логин уже занят");
        }
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new BadRequestException("Электронная почта уже используется");
        }
        if (normalizedPhone != null && userRepository.existsByPhone(normalizedPhone)) {
            throw new BadRequestException("Пользователь с таким номером телефона уже существует");
        }

        User user = User.builder()
            .login(normalizedLogin)
            .email(normalizedEmail)
            .phone(normalizedPhone)
            .passwordHash(passwordEncoder.encode(request.getPassword()))
            .firstName(normalizeOptional(request.getFirstName()))
            .lastName(normalizeOptional(request.getLastName()))
            .createdAt(LocalDateTime.now())
            .status(UserStatus.ACTIVE)
            .build();

        User savedUser = userRepository.save(user);

        Role registrationRole = roleRepository.findByName(requestedRoleName)
            .orElseGet(() -> roleRepository.save(Role.builder().name(requestedRoleName).build()));

        UserRole userRole = userRoleRepository.save(UserRole.builder()
            .id(UserRoleId.builder().userId(savedUser.getId()).roleId(registrationRole.getId()).build())
            .user(savedUser)
            .role(registrationRole)
            .build());
        savedUser.getUserRoles().add(userRole);

        if (requestedRoleName == RoleName.ROLE_ORGANIZER) {
            String organizerCompanyName = normalizeRequired(
                normalizedCompanyName,
                "Введите название компании для регистрации организатора"
            );
            ensureOrganizationProfile(savedUser, organizerCompanyName);
        }

        return AuthResponse.builder()
            .token(jwtService.generateToken(savedUser.getLogin()))
            .user(toCurrentUserResponse(savedUser))
            .build();
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByLoginOrEmailWithRoles(request.getLoginOrEmail())
            .orElseThrow(() -> new UnauthorizedException("Неверный логин/email или пароль"));

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new UnauthorizedException("Учетная запись заблокирована");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new UnauthorizedException("Неверный логин/email или пароль");
        }

        return AuthResponse.builder()
            .token(jwtService.generateToken(user.getLogin()))
            .user(toCurrentUserResponse(user))
            .build();
    }

    private CurrentUserResponse toCurrentUserResponse(User user) {
        Set<String> roles = user.getUserRoles().stream()
            .map(userRole -> normalizeRoleName(userRole.getRole().getName().name()))
            .collect(Collectors.toSet());

        return CurrentUserResponse.builder()
            .id(user.getId())
            .login(user.getLogin())
            .email(user.getEmail())
            .phone(user.getPhone())
            .firstName(user.getFirstName())
            .lastName(user.getLastName())
            .avatarUrl(user.getAvatarUrl())
            .roles(roles)
            .organization(toOrganizationInfo(resolveUserOrganization(user)))
            .build();
    }

    private Organization resolveUserOrganization(User user) {
        if (user == null) {
            return null;
        }
        if (user.getOrganizer() != null && user.getOrganizer().getOrganization() != null) {
            return user.getOrganizer().getOrganization();
        }
        Organizer organizer = organizerRepository.findByUserId(user.getId()).orElse(null);
        if (organizer != null && organizer.getOrganization() != null) {
            return organizer.getOrganization();
        }
        return null;
    }

    private CurrentUserResponse.OrganizationInfo toOrganizationInfo(Organization organization) {
        if (organization == null) {
            return null;
        }
        return CurrentUserResponse.OrganizationInfo.builder()
            .id(organization.getId())
            .name(organization.getName())
            .description(organization.getDescription())
            .contacts(organization.getContacts())
            .build();
    }

    private String normalizeRoleName(String roleName) {
        return roleName.startsWith("ROLE_") ? roleName.substring(5) : roleName;
    }

    private RoleName resolveRegistrationRole(String rawRole) {
        if (!StringUtils.hasText(rawRole)) {
            return RoleName.ROLE_RESIDENT;
        }

        String normalized = rawRole.trim().toUpperCase(Locale.ROOT);
        String prefixed = normalized.startsWith("ROLE_") ? normalized : "ROLE_" + normalized;

        RoleName parsedRole;
        try {
            parsedRole = RoleName.valueOf(prefixed);
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Недопустимая роль при регистрации: " + rawRole);
        }

        if (parsedRole == RoleName.ROLE_ADMIN) {
            throw new BadRequestException("Нельзя зарегистрироваться с ролью администратора");
        }

        if (parsedRole != RoleName.ROLE_RESIDENT && parsedRole != RoleName.ROLE_ORGANIZER) {
            throw new BadRequestException("Недопустимая роль при регистрации: " + rawRole);
        }

        return parsedRole;
    }

    private void ensureOrganizationProfile(User user, String companyName) {
        if (organizerRepository.findByUserId(user.getId()).isPresent()) {
            return;
        }

        String contacts = user.getPhone() != null
            ? user.getEmail() + ", " + user.getPhone()
            : user.getEmail();

        Organization organization = organizationRepository.findByNameIgnoreCase(companyName)
            .orElseGet(() -> organizationRepository.save(Organization.builder()
            .name(companyName)
            .description("Профиль организации")
            .contacts(contacts)
            .build()));
        organizerRepository.save(Organizer.builder()
            .user(user)
            .organization(organization)
            .build());
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
