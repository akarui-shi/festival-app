package com.festivalapp.backend.service;

import com.festivalapp.backend.dto.AuthResponse;
import com.festivalapp.backend.dto.CurrentUserResponse;
import com.festivalapp.backend.dto.LoginRequest;
import com.festivalapp.backend.dto.RegisterRequest;
import com.festivalapp.backend.entity.Role;
import com.festivalapp.backend.entity.RoleName;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.entity.UserRole;
import com.festivalapp.backend.entity.UserRoleId;
import com.festivalapp.backend.entity.UserStatus;
import com.festivalapp.backend.exception.BadRequestException;
import com.festivalapp.backend.exception.UnauthorizedException;
import com.festivalapp.backend.repository.RoleRepository;
import com.festivalapp.backend.repository.UserRepository;
import com.festivalapp.backend.repository.UserRoleRepository;
import com.festivalapp.backend.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByLogin(request.getLogin())) {
            throw new BadRequestException("Логин уже занят");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Электронная почта уже используется");
        }

        User user = User.builder()
            .login(request.getLogin())
            .email(request.getEmail())
            .phone(request.getPhone())
            .passwordHash(passwordEncoder.encode(request.getPassword()))
            .firstName(request.getFirstName())
            .lastName(request.getLastName())
            .createdAt(LocalDateTime.now())
            .status(UserStatus.ACTIVE)
            .build();

        User savedUser = userRepository.save(user);

        // Assign default role for newly registered residents.
        Role residentRole = roleRepository.findByName(RoleName.ROLE_RESIDENT)
            .orElseGet(() -> roleRepository.save(Role.builder().name(RoleName.ROLE_RESIDENT).build()));

        UserRole userRole = userRoleRepository.save(UserRole.builder()
            .id(UserRoleId.builder().userId(savedUser.getId()).roleId(residentRole.getId()).build())
            .user(savedUser)
            .role(residentRole)
            .build());
        savedUser.getUserRoles().add(userRole);

        return AuthResponse.builder()
            .token(jwtService.generateToken(savedUser.getLogin()))
            .user(toCurrentUserResponse(savedUser))
            .build();
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByLoginOrEmailWithRoles(request.getLoginOrEmail())
            .orElseThrow(() -> new UnauthorizedException("Неверный логин/email или пароль"));

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
            .roles(roles)
            .build();
    }

    private String normalizeRoleName(String roleName) {
        return roleName.startsWith("ROLE_") ? roleName.substring(5) : roleName;
    }
}
