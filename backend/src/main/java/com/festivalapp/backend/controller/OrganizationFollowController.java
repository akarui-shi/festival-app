package com.festivalapp.backend.controller;

import com.festivalapp.backend.exception.UnauthorizedException;
import com.festivalapp.backend.service.OrganizationFollowService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/organizations/{id}/follow")
@RequiredArgsConstructor
public class OrganizationFollowController {

    private final OrganizationFollowService followService;

    @PostMapping
    public ResponseEntity<Map<String, Object>> follow(@PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok(followService.follow(id, resolveIdentifier(auth)));
    }

    @DeleteMapping
    public ResponseEntity<Map<String, Object>> unfollow(@PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok(followService.unfollow(id, resolveIdentifier(auth)));
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status(@PathVariable Long id, Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            long count = followService.getFollowersCount(id);
            return ResponseEntity.ok(Map.of("following", false, "followersCount", count));
        }
        return ResponseEntity.ok(followService.getStatus(id, resolveIdentifier(auth)));
    }

    private String resolveIdentifier(Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) throw new UnauthorizedException("Unauthorized");
        Object principal = auth.getPrincipal();
        if (principal instanceof UserDetails ud) return ud.getUsername();
        return auth.getName();
    }
}
