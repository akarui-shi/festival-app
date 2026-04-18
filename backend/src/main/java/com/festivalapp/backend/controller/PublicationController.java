package com.festivalapp.backend.controller;

import com.festivalapp.backend.dto.PublicationCreateRequest;
import com.festivalapp.backend.dto.PublicationDetailsResponse;
import com.festivalapp.backend.dto.PublicationShortResponse;
import com.festivalapp.backend.dto.PublicationStatusUpdateRequest;
import com.festivalapp.backend.dto.PublicationUpdateRequest;
import com.festivalapp.backend.exception.UnauthorizedException;
import com.festivalapp.backend.service.PublicationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
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
import java.util.Map;

@RestController
@RequestMapping("/api/publications")
@RequiredArgsConstructor
public class PublicationController {

    private final PublicationService publicationService;

    @PostMapping
    public ResponseEntity<PublicationDetailsResponse> create(@Valid @RequestBody PublicationCreateRequest request,
                                                             @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(publicationService.create(request, extractUsername(principal)));
    }

    @GetMapping
    public ResponseEntity<List<PublicationShortResponse>> getAll(@RequestParam(required = false) Long eventId,
                                                                 @RequestParam(required = false) Long organizationId,
                                                                 @RequestParam(required = false) String title) {
        return ResponseEntity.ok(publicationService.getPublicList(eventId, organizationId, title));
    }

    @GetMapping("/mine")
    public ResponseEntity<List<PublicationShortResponse>> getMine(@AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(publicationService.getMine(extractUsername(principal)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PublicationDetailsResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(publicationService.getPublicById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PublicationDetailsResponse> update(@PathVariable Long id,
                                                             @Valid @RequestBody PublicationUpdateRequest request,
                                                             @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(publicationService.update(id, request, extractUsername(principal)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable Long id,
                                                      @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(publicationService.delete(id, extractUsername(principal)));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<PublicationDetailsResponse> updateStatus(@PathVariable Long id,
                                                                   @Valid @RequestBody PublicationStatusUpdateRequest request) {
        return ResponseEntity.ok(publicationService.updateStatus(id, request.getStatus()));
    }

    private String extractUsername(UserDetails principal) {
        if (principal == null) {
            throw new UnauthorizedException("Unauthorized user");
        }
        return principal.getUsername();
    }
}
