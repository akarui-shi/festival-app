package com.festivalapp.backend.controller;

import com.festivalapp.backend.dto.EventCreateRequest;
import com.festivalapp.backend.dto.EventDetailsResponse;
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
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
public class EventController {

    private final EventService eventService;

    @GetMapping
    public ResponseEntity<List<EventShortResponse>> getAll(@RequestParam(required = false) String title,
                                                           @RequestParam(required = false) Long categoryId,
                                                           @RequestParam(required = false) Long venueId,
                                                           @RequestParam(required = false) Long cityId,
                                                           @RequestParam(required = false) String status,
                                                           @RequestParam(required = false) String sortBy,
                                                           @RequestParam(required = false) String sortDir) {
        return ResponseEntity.ok(eventService.getAll(title, categoryId, venueId, cityId, status, sortBy, sortDir));
    }

    @GetMapping("/{id}")
    public ResponseEntity<EventDetailsResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(eventService.getById(id));
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
