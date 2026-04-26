package com.festivalapp.backend.controller;

import com.festivalapp.backend.dto.NotificationResponse;
import com.festivalapp.backend.exception.UnauthorizedException;
import com.festivalapp.backend.service.InAppNotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class InAppNotificationController {

    private final InAppNotificationService notificationService;

    @GetMapping
    public ResponseEntity<List<NotificationResponse>> list(Authentication auth) {
        return ResponseEntity.ok(notificationService.getForUser(resolveIdentifier(auth)));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> unreadCount(Authentication auth) {
        return ResponseEntity.ok(notificationService.getUnreadCount(resolveIdentifier(auth)));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<Void> markRead(@PathVariable Long id, Authentication auth) {
        notificationService.markRead(id, resolveIdentifier(auth));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/mark-all-read")
    public ResponseEntity<Void> markAllRead(Authentication auth) {
        notificationService.markAllRead(resolveIdentifier(auth));
        return ResponseEntity.noContent().build();
    }

    private String resolveIdentifier(Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) throw new UnauthorizedException("Unauthorized");
        Object principal = auth.getPrincipal();
        if (principal instanceof UserDetails ud) return ud.getUsername();
        return auth.getName();
    }
}
