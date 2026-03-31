package com.festivalapp.backend.controller;

import com.festivalapp.backend.dto.UserResponse;
import com.festivalapp.backend.exception.BadRequestException;
import com.festivalapp.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<UserResponse> getMe(@AuthenticationPrincipal UserDetails principal) {
        if (principal == null) {
            throw new BadRequestException("Unauthorized user");
        }
        return ResponseEntity.ok(userService.getCurrentUser(principal.getUsername()));
    }
}
