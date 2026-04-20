package com.festivalapp.backend.controller;

import com.festivalapp.backend.dto.SessionCreateRequest;
import com.festivalapp.backend.dto.SessionDetailsResponse;
import com.festivalapp.backend.dto.SessionRegistrationResponse;
import com.festivalapp.backend.dto.SessionShortResponse;
import com.festivalapp.backend.dto.SessionTicketTypeResponse;
import com.festivalapp.backend.dto.SessionUpdateRequest;
import com.festivalapp.backend.exception.UnauthorizedException;
import com.festivalapp.backend.service.SessionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sessions")
@RequiredArgsConstructor
public class SessionController {

    private final SessionService sessionService;

    @GetMapping
    public ResponseEntity<List<SessionShortResponse>> getAll(@RequestParam(required = false) Long eventId,
                                                             @RequestParam(required = false) Long venueId,
                                                             @RequestParam(required = false) Long cityId,
                                                             @RequestParam(required = false)
                                                             @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                                                             LocalDate dateFrom,
                                                             @RequestParam(required = false)
                                                             @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                                                             LocalDate dateTo,
                                                             @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(sessionService.getAll(
            eventId,
            venueId,
            cityId,
            dateFrom,
            dateTo,
            extractOptionalUsername(principal)
        ));
    }

    @GetMapping("/{id}")
    public ResponseEntity<SessionDetailsResponse> getById(@PathVariable Long id,
                                                          @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(sessionService.getById(id, extractOptionalUsername(principal)));
    }

    @GetMapping("/{id}/ticket-types")
    public ResponseEntity<List<SessionTicketTypeResponse>> getTicketTypes(@PathVariable Long id) {
        return ResponseEntity.ok(sessionService.getTicketTypes(id));
    }

    @PostMapping
    public ResponseEntity<SessionDetailsResponse> create(@Valid @RequestBody SessionCreateRequest request,
                                                         @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(sessionService.create(request, extractUsername(principal)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SessionDetailsResponse> update(@PathVariable Long id,
                                                         @Valid @RequestBody SessionUpdateRequest request,
                                                         @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(sessionService.update(id, request, extractUsername(principal)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable Long id,
                                                      @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(sessionService.delete(id, extractUsername(principal)));
    }

    @GetMapping("/{id}/registrations")
    public ResponseEntity<List<SessionRegistrationResponse>> getSessionRegistrations(@PathVariable Long id,
                                                                                     @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(sessionService.getSessionRegistrations(id, extractUsername(principal)));
    }

    private String extractUsername(UserDetails principal) {
        if (principal == null) {
            throw new UnauthorizedException("Unauthorized user");
        }
        return principal.getUsername();
    }

    private String extractOptionalUsername(UserDetails principal) {
        return principal == null ? null : principal.getUsername();
    }
}
