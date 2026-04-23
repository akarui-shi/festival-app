package com.festivalapp.backend.controller;

import com.festivalapp.backend.dto.AuthResponse;
import com.festivalapp.backend.dto.EmailVerificationConfirmRequest;
import com.festivalapp.backend.dto.LoginRequest;
import com.festivalapp.backend.dto.MessageResponse;
import com.festivalapp.backend.dto.RegisterRequest;
import com.festivalapp.backend.dto.RegisterResponse;
import com.festivalapp.backend.service.AuthService;
import com.festivalapp.backend.service.EmailVerificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final EmailVerificationService emailVerificationService;

    @PostMapping("/register")
    public ResponseEntity<RegisterResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/verify-email")
    public ResponseEntity<MessageResponse> verifyEmail(@Valid @RequestBody EmailVerificationConfirmRequest request) {
        return ResponseEntity.ok(emailVerificationService.confirmEmail(request.getToken()));
    }
}
