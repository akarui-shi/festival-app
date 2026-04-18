package com.festivalapp.backend.controller;

import com.festivalapp.backend.dto.OrganizationJoinRequestCreateRequest;
import com.festivalapp.backend.dto.OrganizationJoinRequestDecisionRequest;
import com.festivalapp.backend.dto.OrganizationJoinRequestResponse;
import com.festivalapp.backend.dto.OrganizationPublicResponse;
import com.festivalapp.backend.dto.OrganizationUpdateRequest;
import com.festivalapp.backend.exception.UnauthorizedException;
import com.festivalapp.backend.service.OrganizationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/organizations")
@RequiredArgsConstructor
public class OrganizationController {

    private final OrganizationService organizationService;

    @GetMapping
    public ResponseEntity<List<OrganizationPublicResponse>> search(@RequestParam(required = false) String q) {
        return ResponseEntity.ok(organizationService.searchPublicOrganizations(q));
    }

    @PutMapping("/{id}")
    public ResponseEntity<OrganizationPublicResponse> update(@PathVariable Long id,
                                                             @Valid @RequestBody OrganizationUpdateRequest request,
                                                             @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(organizationService.updateOrganization(id, request, extractUsername(principal)));
    }

    @PostMapping("/join-requests")
    public ResponseEntity<OrganizationJoinRequestResponse> createJoinRequest(@Valid @RequestBody OrganizationJoinRequestCreateRequest request,
                                                                             @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(organizationService.createJoinRequest(request, extractUsername(principal)));
    }

    @GetMapping("/join-requests/my")
    public ResponseEntity<List<OrganizationJoinRequestResponse>> myJoinRequests(@AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(organizationService.getMyJoinRequests(extractUsername(principal)));
    }

    @GetMapping("/join-requests/pending")
    public ResponseEntity<List<OrganizationJoinRequestResponse>> pending(@AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(organizationService.getPendingForAdmin(extractUsername(principal)));
    }

    @GetMapping("/{id}/join-requests")
    public ResponseEntity<List<OrganizationJoinRequestResponse>> organizationJoinRequests(@PathVariable Long id,
                                                                                           @RequestParam(required = false) String status,
                                                                                           @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(organizationService.getOrganizationJoinRequests(id, extractUsername(principal), status));
    }

    @PatchMapping("/join-requests/{requestId}")
    public ResponseEntity<OrganizationJoinRequestResponse> decideRequest(@PathVariable Long requestId,
                                                                         @Valid @RequestBody OrganizationJoinRequestDecisionRequest request,
                                                                         @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(organizationService.decideJoinRequest(requestId, request, extractUsername(principal)));
    }

    private String extractUsername(UserDetails principal) {
        if (principal == null) {
            throw new UnauthorizedException("Unauthorized user");
        }
        return principal.getUsername();
    }
}
