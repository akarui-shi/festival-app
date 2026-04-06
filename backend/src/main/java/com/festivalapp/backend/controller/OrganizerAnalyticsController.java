package com.festivalapp.backend.controller;

import com.festivalapp.backend.dto.OrganizerAnalyticsOverviewResponse;
import com.festivalapp.backend.dto.OrganizerEventAnalyticsResponse;
import com.festivalapp.backend.dto.OrganizerEventEngagementResponse;
import com.festivalapp.backend.dto.OrganizerEventTrafficResponse;
import com.festivalapp.backend.exception.UnauthorizedException;
import com.festivalapp.backend.service.OrganizerAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/organizer/analytics")
@RequiredArgsConstructor
public class OrganizerAnalyticsController {

    private final OrganizerAnalyticsService organizerAnalyticsService;

    @GetMapping("/overview")
    public ResponseEntity<OrganizerAnalyticsOverviewResponse> getOverview(
        @AuthenticationPrincipal UserDetails principal,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        if (principal == null) {
            throw new UnauthorizedException("Unauthorized user");
        }

        return ResponseEntity.ok(organizerAnalyticsService.getOverview(principal.getUsername(), from, to));
    }

    @GetMapping("/events/{id}")
    public ResponseEntity<OrganizerEventAnalyticsResponse> getEventAnalytics(
        @PathVariable Long id,
        @AuthenticationPrincipal UserDetails principal,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        if (principal == null) {
            throw new UnauthorizedException("Unauthorized user");
        }

        return ResponseEntity.ok(organizerAnalyticsService.getEventAnalytics(id, principal.getUsername(), from, to));
    }

    @GetMapping("/events/{id}/traffic")
    public ResponseEntity<OrganizerEventTrafficResponse> getEventTraffic(
        @PathVariable Long id,
        @AuthenticationPrincipal UserDetails principal,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        if (principal == null) {
            throw new UnauthorizedException("Unauthorized user");
        }

        return ResponseEntity.ok(organizerAnalyticsService.getEventTraffic(id, principal.getUsername(), from, to));
    }

    @GetMapping("/events/{id}/engagement")
    public ResponseEntity<OrganizerEventEngagementResponse> getEventEngagement(
        @PathVariable Long id,
        @AuthenticationPrincipal UserDetails principal,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        if (principal == null) {
            throw new UnauthorizedException("Unauthorized user");
        }

        return ResponseEntity.ok(organizerAnalyticsService.getEventEngagement(id, principal.getUsername(), from, to));
    }
}
