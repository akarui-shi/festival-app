package com.festivalapp.backend.service;

import com.festivalapp.backend.dto.CurrentUserResponse;
import com.festivalapp.backend.dto.UpdateCurrentUserRequest;
import com.festivalapp.backend.entity.Organization;
import com.festivalapp.backend.entity.OrganizationMember;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.exception.BadRequestException;
import com.festivalapp.backend.exception.ResourceNotFoundException;
import com.festivalapp.backend.repository.OrganizationMemberRepository;
import com.festivalapp.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final OrganizationMemberRepository organizationMemberRepository;

    @Transactional(readOnly = true)
    public CurrentUserResponse getCurrentUser(String username) {
        User user = userRepository.findByLoginOrEmailWithRoles(username)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        return toCurrentUserResponse(user);
    }

    @Transactional
    public CurrentUserResponse updateCurrentUser(String username, UpdateCurrentUserRequest request) {
        User user = userRepository.findByLoginOrEmailWithRoles(username)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        String normalizedLogin = normalizeRequired(request.getLogin(), "Введите логин");
        String normalizedEmail = normalizeRequired(request.getEmail(), "Введите электронную почту");
        String normalizedPhone = normalizeOptional(request.getPhone());

        if (userRepository.existsByLoginAndIdNot(normalizedLogin, user.getId())) {
            throw new BadRequestException("Логин уже занят");
        }
        if (userRepository.existsByEmailAndIdNot(normalizedEmail, user.getId())) {
            throw new BadRequestException("Электронная почта уже используется");
        }
        if (normalizedPhone != null && userRepository.existsByPhoneAndIdNot(normalizedPhone, user.getId())) {
            throw new BadRequestException("Пользователь с таким номером телефона уже существует");
        }

        user.setLogin(normalizedLogin);
        user.setEmail(normalizedEmail);
        user.setFirstName(normalizeOptional(request.getFirstName()) == null ? user.getFirstName() : normalizeOptional(request.getFirstName()));
        user.setLastName(normalizeOptional(request.getLastName()) == null ? user.getLastName() : normalizeOptional(request.getLastName()));
        user.setPhone(normalizedPhone);
        user.setAvatarUrl(normalizeOptional(request.getAvatarUrl()));
        user.setUpdatedAt(OffsetDateTime.now());

        User saved = userRepository.save(user);
        return toCurrentUserResponse(saved);
    }

    private CurrentUserResponse toCurrentUserResponse(User user) {
        Set<String> roles = user.getUserRoles().stream()
            .map(userRole -> userRole.getRole().toRoleName().toApiName())
            .collect(Collectors.toSet());

        Optional<OrganizationMember> ownerMembership = organizationMemberRepository
            .findFirstByUserIdAndOrganizationStatusAndLeftAtIsNull(user.getId(), "владелец");

        return CurrentUserResponse.builder()
            .id(user.getId())
            .login(user.getLogin())
            .email(user.getEmail())
            .phone(user.getPhone())
            .firstName(user.getFirstName())
            .lastName(user.getLastName())
            .avatarUrl(user.getAvatarUrl())
            .roles(roles)
            .organization(ownerMembership.map(this::toOrganizationInfo).orElse(null))
            .build();
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
