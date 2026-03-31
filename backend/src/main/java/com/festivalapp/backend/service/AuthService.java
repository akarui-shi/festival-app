package com.festivalapp.backend.service;

import com.festivalapp.backend.dto.AuthResponse;
import com.festivalapp.backend.dto.LoginRequest;
import com.festivalapp.backend.dto.RegisterRequest;
import com.festivalapp.backend.dto.UserResponse;
import com.festivalapp.backend.entity.Role;
import com.festivalapp.backend.entity.RoleName;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.entity.UserRole;
import com.festivalapp.backend.entity.UserRoleId;
import com.festivalapp.backend.entity.UserStatus;
import com.festivalapp.backend.exception.BadRequestException;
import com.festivalapp.backend.repository.RoleRepository;
import com.festivalapp.backend.repository.UserRepository;
import com.festivalapp.backend.repository.UserRoleRepository;
import com.festivalapp.backend.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

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
            throw new BadRequestException("Login already exists");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email already exists");
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

        userRoleRepository.save(UserRole.builder()
            .id(UserRoleId.builder().userId(savedUser.getId()).roleId(residentRole.getId()).build())
            .user(savedUser)
            .role(residentRole)
            .build());

        return AuthResponse.builder()
            .token(jwtService.generateToken(savedUser.getLogin()))
            .user(toUserResponse(savedUser))
            .build();
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByLogin(request.getUsername())
            .or(() -> userRepository.findByEmail(request.getUsername()))
            .orElseThrow(() -> new BadRequestException("Invalid credentials"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new BadRequestException("Invalid credentials");
        }

        return AuthResponse.builder()
            .token(jwtService.generateToken(user.getLogin()))
            .user(toUserResponse(user))
            .build();
    }

    private UserResponse toUserResponse(User user) {
        return UserResponse.builder()
            .id(user.getId())
            .login(user.getLogin())
            .email(user.getEmail())
            .phone(user.getPhone())
            .firstName(user.getFirstName())
            .lastName(user.getLastName())
            .avatarUrl(user.getAvatarUrl())
            .status(user.getStatus())
            .build();
    }
}
