package com.festivalapp.backend.controller;

import com.festivalapp.backend.dto.MyRegistrationResponse;
import com.festivalapp.backend.dto.RegistrationCreateRequest;
import com.festivalapp.backend.dto.RegistrationResponse;
import com.festivalapp.backend.exception.UnauthorizedException;
import com.festivalapp.backend.service.RegistrationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/registrations")
@RequiredArgsConstructor
public class RegistrationController {

    private final RegistrationService registrationService;

    @PostMapping
    public ResponseEntity<RegistrationResponse> create(@Valid @RequestBody RegistrationCreateRequest request,
                                                       @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(registrationService.create(request, extractUsername(principal)));
    }

    @GetMapping("/my")
    public ResponseEntity<List<MyRegistrationResponse>> getMyRegistrations(@AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(registrationService.getMyRegistrations(extractUsername(principal)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> cancelRegistration(@PathVariable Long id,
                                                                  @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(registrationService.cancelRegistration(id, extractUsername(principal)));
    }

    private String extractUsername(UserDetails principal) {
        if (principal == null) {
            throw new UnauthorizedException("Unauthorized user");
        }
        return principal.getUsername();
    }
}
