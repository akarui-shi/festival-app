package com.festivalapp.backend.controller;

import com.festivalapp.backend.dto.EventCreateRequest;
import com.festivalapp.backend.dto.EventDetailsResponse;
import com.festivalapp.backend.dto.OrganizationPublicResponse;
import com.festivalapp.backend.dto.EventShortResponse;
import com.festivalapp.backend.dto.EventUpdateRequest;
import com.festivalapp.backend.exception.UnauthorizedException;
import com.festivalapp.backend.service.EventService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.time.LocalDate;
import java.util.HashMap;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
public class EventController {

    private final EventService eventService;

    @GetMapping
    public ResponseEntity<List<EventShortResponse>> getAll(@RequestParam(required = false) String title,
                                                           @RequestParam(required = false) String q,
                                                           @RequestParam(required = false) Long categoryId,
                                                           @RequestParam(required = false) Long venueId,
                                                           @RequestParam(required = false) Long cityId,
                                                           @RequestParam(required = false) Long organizationId,
                                                           @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                                                           LocalDate date,
                                                           @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                                                           LocalDate dateFrom,
                                                           @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                                                           LocalDate dateTo,
                                                           @RequestParam(required = false) String participationType,
                                                           @RequestParam(required = false) BigDecimal priceFrom,
                                                           @RequestParam(required = false) BigDecimal priceTo,
                                                           @RequestParam(required = false) Boolean registrationOpen,
                                                           @RequestParam(required = false) String status,
                                                           @RequestParam(required = false) String sortBy,
                                                           @RequestParam(required = false) String sortDir) {
        return ResponseEntity.ok(eventService.getAll(
            title,
            q,
            categoryId,
            venueId,
            cityId,
            organizationId,
            date,
            dateFrom,
            dateTo,
            participationType,
            priceFrom,
            priceTo,
            registrationOpen,
            status,
            sortBy,
            sortDir
        ));
    }

    @GetMapping("/recommendations")
    public ResponseEntity<List<EventShortResponse>> getRecommendations(@RequestParam(required = false) Long cityId,
                                                                       @RequestParam(required = false) Integer limit,
                                                                       @AuthenticationPrincipal UserDetails principal) {
        String actorIdentifier = principal != null ? principal.getUsername() : null;
        return ResponseEntity.ok(eventService.getRecommendations(actorIdentifier, cityId, limit));
    }

    @GetMapping("/platform-stats")
    public ResponseEntity<Map<String, Long>> getPlatformStats() {
        return ResponseEntity.ok(eventService.getPlatformStats());
    }

    @GetMapping("/{id}/similar")
    public ResponseEntity<List<EventShortResponse>> getSimilar(@PathVariable Long id,
                                                               @RequestParam(required = false) Integer limit) {
        return ResponseEntity.ok(eventService.getSimilarEvents(id, limit));
    }

    @GetMapping("/{id}")
    public ResponseEntity<EventDetailsResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(eventService.getById(id));
    }

    @GetMapping("/organizations/{organizationId}")
    public ResponseEntity<OrganizationPublicResponse> getOrganizationProfile(@PathVariable Long organizationId) {
        return ResponseEntity.ok(eventService.getOrganizationProfile(organizationId));
    }

    @GetMapping("/organizations/{organizationId}/events")
    public ResponseEntity<List<EventShortResponse>> getOrganizationEvents(@PathVariable Long organizationId) {
        return ResponseEntity.ok(eventService.getPublicByOrganization(organizationId));
    }

    @PostMapping
    public ResponseEntity<EventShortResponse> create(@Valid @RequestBody EventCreateRequest request,
                                                     @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.status(HttpStatus.CREATED).body(eventService.create(request, extractUsername(principal)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<EventShortResponse> update(@PathVariable Long id,
                                                     @Valid @RequestBody EventUpdateRequest request,
                                                     @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(eventService.update(id, request, extractUsername(principal)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable Long id,
                                                      @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(eventService.delete(id, extractUsername(principal)));
    }

    @PostMapping("/{id}/archive")
    public ResponseEntity<Map<String, Object>> archive(@PathVariable Long id,
                                                       @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(eventService.archive(id, extractUsername(principal)));
    }

    private String extractUsername(UserDetails principal) {
        if (principal == null) {
            throw new UnauthorizedException("Unauthorized user");
        }
        return principal.getUsername();
    }
}
