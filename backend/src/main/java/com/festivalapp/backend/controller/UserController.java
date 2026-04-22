package com.festivalapp.backend.controller;

import com.festivalapp.backend.dto.AuthResponse;
import com.festivalapp.backend.dto.CurrentUserResponse;
import com.festivalapp.backend.dto.UpdateCurrentUserRequest;
import com.festivalapp.backend.exception.UnauthorizedException;
import com.festivalapp.backend.security.JwtService;
import com.festivalapp.backend.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final JwtService jwtService;

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
