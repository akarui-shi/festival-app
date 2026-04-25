package com.festivalapp.backend.controller;

import com.festivalapp.backend.dto.AuthResponse;
import com.festivalapp.backend.dto.ChangePasswordRequest;
import com.festivalapp.backend.dto.CurrentUserResponse;
import com.festivalapp.backend.dto.UpdateCurrentUserRequest;
import com.festivalapp.backend.entity.UserInterest;
import com.festivalapp.backend.exception.UnauthorizedException;
import com.festivalapp.backend.repository.UserInterestRepository;
import com.festivalapp.backend.repository.UserRepository;
import com.festivalapp.backend.security.JwtService;
import com.festivalapp.backend.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final JwtService jwtService;
    private final UserInterestRepository userInterestRepository;
    private final UserRepository userRepository;

    @GetMapping("/me")
    public ResponseEntity<CurrentUserResponse> getMe(Authentication authentication) {
        return ResponseEntity.ok(userService.getCurrentUser(extractUserIdentifier(authentication)));
    }

    @PutMapping("/me")
    public ResponseEntity<AuthResponse> updateMe(@Valid @RequestBody UpdateCurrentUserRequest request,
                                                 Authentication authentication) {
        CurrentUserResponse updatedUser = userService.updateCurrentUser(extractUserIdentifier(authentication), request);
        AuthResponse response = AuthResponse.builder()
            .token(jwtService.generateToken(updatedUser.getLogin()))
            .user(updatedUser)
            .build();
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/me/password")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody ChangePasswordRequest request,
                                               Authentication authentication) {
        userService.changeCurrentUserPassword(extractUserIdentifier(authentication), request);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me/interests")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Long>> getMyInterests(Authentication authentication) {
        String identifier = extractUserIdentifier(authentication);
        var user = userRepository.findByLoginOrEmailWithRoles(identifier).orElseThrow(
            () -> new UnauthorizedException("User not found")
        );
        List<Long> categoryIds = userInterestRepository.findAllByUserId(user.getId())
            .stream()
            .map(UserInterest::getCategoryId)
            .toList();
        return ResponseEntity.ok(categoryIds);
    }

    @PutMapping("/me/interests")
    @Transactional
    public ResponseEntity<Void> updateMyInterests(@RequestBody List<Long> categoryIds,
                                                  Authentication authentication) {
        String identifier = extractUserIdentifier(authentication);
        var user = userRepository.findByLoginOrEmailWithRoles(identifier).orElseThrow(
            () -> new UnauthorizedException("User not found")
        );
        userInterestRepository.deleteAllByUserId(user.getId());
        if (categoryIds != null) {
            List<UserInterest> interests = categoryIds.stream()
                .distinct()
                .map(categoryId -> UserInterest.builder()
                    .userId(user.getId())
                    .categoryId(categoryId)
                    .build())
                .toList();
            userInterestRepository.saveAll(interests);
        }
        return ResponseEntity.noContent().build();
    }

    private String extractUserIdentifier(Authentication authentication) {
        if (authentication == null
            || !authentication.isAuthenticated()
            || authentication instanceof AnonymousAuthenticationToken) {
            throw new UnauthorizedException("Unauthorized user");
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof UserDetails userDetails && StringUtils.hasText(userDetails.getUsername())) {
            return userDetails.getUsername();
        }
        if (principal instanceof OAuth2User oauth2User) {
            String email = oauth2User.getAttribute("email");
            if (StringUtils.hasText(email)) {
                return email;
            }
            String defaultEmail = oauth2User.getAttribute("default_email");
            if (StringUtils.hasText(defaultEmail)) {
                return defaultEmail;
            }
            if (StringUtils.hasText(oauth2User.getName())) {
                return oauth2User.getName();
            }
        }
        if (principal instanceof String principalString && StringUtils.hasText(principalString)
            && !"anonymousUser".equalsIgnoreCase(principalString)) {
            return principalString;
        }
        if (StringUtils.hasText(authentication.getName())
            && !"anonymousUser".equalsIgnoreCase(authentication.getName())) {
            return authentication.getName();
        }

        throw new UnauthorizedException("Unauthorized user");
    }
}
