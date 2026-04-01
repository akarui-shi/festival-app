package com.festivalapp.backend.controller;

import com.festivalapp.backend.dto.EventDetailsResponse;
import com.festivalapp.backend.dto.EventShortResponse;
import com.festivalapp.backend.exception.UnauthorizedException;
import com.festivalapp.backend.service.EventService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/organizer")
@RequiredArgsConstructor
public class OrganizerController {

    private final EventService eventService;

    @GetMapping("/events")
    public ResponseEntity<List<EventShortResponse>> getOrganizerEvents(@AuthenticationPrincipal UserDetails principal) {
        if (principal == null) {
            throw new UnauthorizedException("Unauthorized user");
        }
        return ResponseEntity.ok(eventService.getOrganizerEvents(principal.getUsername()));
    }

    @GetMapping("/events/{id}")
    public ResponseEntity<EventDetailsResponse> getOrganizerEventById(@PathVariable Long id,
                                                                      @AuthenticationPrincipal UserDetails principal) {
        if (principal == null) {
            throw new UnauthorizedException("Unauthorized user");
        }
        return ResponseEntity.ok(eventService.getOrganizerEventById(id, principal.getUsername()));
    }
}
