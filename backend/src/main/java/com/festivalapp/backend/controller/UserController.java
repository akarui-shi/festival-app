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
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
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
    public ResponseEntity<CurrentUserResponse> getMe(@AuthenticationPrincipal UserDetails principal) {
        if (principal == null) {
            throw new UnauthorizedException("Unauthorized user");
        }
        return ResponseEntity.ok(userService.getCurrentUser(principal.getUsername()));
    }

    @PutMapping("/me")
    public ResponseEntity<AuthResponse> updateMe(@Valid @RequestBody UpdateCurrentUserRequest request,
                                                 @AuthenticationPrincipal UserDetails principal) {
        if (principal == null) {
            throw new UnauthorizedException("Unauthorized user");
        }
        CurrentUserResponse updatedUser = userService.updateCurrentUser(principal.getUsername(), request);
        AuthResponse response = AuthResponse.builder()
            .token(jwtService.generateToken(updatedUser.getLogin()))
            .user(updatedUser)
            .build();
        return ResponseEntity.ok(response);
    }
}
