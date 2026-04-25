package com.festivalapp.backend.controller;

import com.festivalapp.backend.exception.UnauthorizedException;
import com.festivalapp.backend.service.WaitlistService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/sessions/{sessionId}/waitlist")
@RequiredArgsConstructor
public class WaitlistController {

    private final WaitlistService waitlistService;

    @PostMapping
    public ResponseEntity<Map<String, Object>> join(@PathVariable Long sessionId,
                                                    Authentication authentication) {
        return ResponseEntity.ok(waitlistService.joinWaitlist(sessionId, resolveIdentifier(authentication)));
    }

    @DeleteMapping
    public ResponseEntity<Void> leave(@PathVariable Long sessionId,
                                      Authentication authentication) {
        waitlistService.leaveWaitlist(sessionId, resolveIdentifier(authentication));
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status(@PathVariable Long sessionId,
                                                      Authentication authentication) {
        return ResponseEntity.ok(waitlistService.getStatus(sessionId, resolveIdentifier(authentication)));
    }

    private String resolveIdentifier(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new UnauthorizedException("Unauthorized");
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof UserDetails ud && StringUtils.hasText(ud.getUsername())) {
            return ud.getUsername();
        }
        if (StringUtils.hasText(authentication.getName())) {
            return authentication.getName();
        }
        throw new UnauthorizedException("Unauthorized");
    }
}
