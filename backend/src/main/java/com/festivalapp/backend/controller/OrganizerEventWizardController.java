package com.festivalapp.backend.controller;

import com.festivalapp.backend.dto.OrganizerEventArtistsRequest;
import com.festivalapp.backend.dto.OrganizerEventBasicInfoRequest;
import com.festivalapp.backend.dto.OrganizerEventCategoriesRequest;
import com.festivalapp.backend.dto.OrganizerEventImagesRequest;
import com.festivalapp.backend.dto.OrganizerEventSessionsRequest;
import com.festivalapp.backend.dto.OrganizerEventTicketsRequest;
import com.festivalapp.backend.dto.OrganizerEventWizardCreateRequest;
import com.festivalapp.backend.dto.OrganizerEventWizardResponse;
import com.festivalapp.backend.dto.OrganizerOrganizationOptionResponse;
import com.festivalapp.backend.exception.UnauthorizedException;
import com.festivalapp.backend.service.OrganizerEventWizardService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/organizer")
@RequiredArgsConstructor
public class OrganizerEventWizardController {

    private final OrganizerEventWizardService wizardService;

    @GetMapping("/organizations")
    public ResponseEntity<List<OrganizerOrganizationOptionResponse>> organizations(@AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(wizardService.getAvailableOrganizations(extractUsername(principal)));
    }

    @PostMapping("/events/wizard")
    public ResponseEntity<OrganizerEventWizardResponse> createDraft(@Valid @RequestBody(required = false) OrganizerEventWizardCreateRequest request,
                                                                    @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(wizardService.createDraft(request, extractUsername(principal)));
    }

    @GetMapping("/events/wizard/{eventId}")
    public ResponseEntity<OrganizerEventWizardResponse> state(@PathVariable Long eventId,
                                                              @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(wizardService.getWizardState(eventId, extractUsername(principal)));
    }

    @PutMapping("/events/wizard/{eventId}/basic-info")
    public ResponseEntity<OrganizerEventWizardResponse> updateBasicInfo(@PathVariable Long eventId,
                                                                        @Valid @RequestBody OrganizerEventBasicInfoRequest request,
                                                                        @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(wizardService.updateBasicInfo(eventId, request, extractUsername(principal)));
    }

    @PutMapping("/events/wizard/{eventId}/categories")
    public ResponseEntity<OrganizerEventWizardResponse> updateCategories(@PathVariable Long eventId,
                                                                         @Valid @RequestBody OrganizerEventCategoriesRequest request,
                                                                         @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(wizardService.updateCategories(eventId, request, extractUsername(principal)));
    }

    @PutMapping("/events/wizard/{eventId}/images")
    public ResponseEntity<OrganizerEventWizardResponse> updateImages(@PathVariable Long eventId,
                                                                     @Valid @RequestBody OrganizerEventImagesRequest request,
                                                                     @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(wizardService.updateImages(eventId, request, extractUsername(principal)));
    }

    @PutMapping("/events/wizard/{eventId}/artists")
    public ResponseEntity<OrganizerEventWizardResponse> updateArtists(@PathVariable Long eventId,
                                                                      @Valid @RequestBody OrganizerEventArtistsRequest request,
                                                                      @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(wizardService.updateArtists(eventId, request, extractUsername(principal)));
    }

    @PutMapping("/events/wizard/{eventId}/sessions")
    public ResponseEntity<OrganizerEventWizardResponse> updateSessions(@PathVariable Long eventId,
                                                                       @Valid @RequestBody OrganizerEventSessionsRequest request,
                                                                       @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(wizardService.updateSessions(eventId, request, extractUsername(principal)));
    }

    @PutMapping("/events/wizard/{eventId}/tickets")
    public ResponseEntity<OrganizerEventWizardResponse> updateTickets(@PathVariable Long eventId,
                                                                      @Valid @RequestBody OrganizerEventTicketsRequest request,
                                                                      @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(wizardService.updateTickets(eventId, request, extractUsername(principal)));
    }

    @GetMapping("/events/wizard/{eventId}/preview")
    public ResponseEntity<OrganizerEventWizardResponse> preview(@PathVariable Long eventId,
                                                                @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(wizardService.getPreview(eventId, extractUsername(principal)));
    }

    @PostMapping("/events/wizard/{eventId}/save-draft")
    public ResponseEntity<OrganizerEventWizardResponse> saveDraft(@PathVariable Long eventId,
                                                                  @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(wizardService.saveAsDraft(eventId, extractUsername(principal)));
    }

    @PostMapping("/events/wizard/{eventId}/submit")
    public ResponseEntity<OrganizerEventWizardResponse> submit(@PathVariable Long eventId,
                                                               @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(wizardService.submitForModeration(eventId, extractUsername(principal)));
    }

    private String extractUsername(UserDetails principal) {
        if (principal == null) {
            throw new UnauthorizedException("Unauthorized user");
        }
        return principal.getUsername();
    }
}
