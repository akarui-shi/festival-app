package com.festivalapp.backend.controller;

import com.festivalapp.backend.dto.ParticipantDetailsResponse;
import com.festivalapp.backend.dto.ParticipantSummaryResponse;
import com.festivalapp.backend.dto.ParticipantUpsertRequest;
import com.festivalapp.backend.exception.UnauthorizedException;
import com.festivalapp.backend.service.ParticipantService;
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

@RestController
@RequestMapping("/api/participants")
@RequiredArgsConstructor
public class ParticipantController {

    private final ParticipantService participantService;

    @GetMapping
    public ResponseEntity<List<ParticipantSummaryResponse>> getAll(@RequestParam(required = false) String q) {
        return ResponseEntity.ok(participantService.getPublicList(q));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ParticipantDetailsResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(participantService.getPublicById(id));
    }

    @PostMapping
    public ResponseEntity<ParticipantSummaryResponse> create(@Valid @RequestBody ParticipantUpsertRequest request,
                                                             @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(participantService.create(request, extractUsername(principal)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ParticipantSummaryResponse> update(@PathVariable Long id,
                                                             @Valid @RequestBody ParticipantUpsertRequest request,
                                                             @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(participantService.update(id, request, extractUsername(principal)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id,
                                       @AuthenticationPrincipal UserDetails principal) {
        participantService.delete(id, extractUsername(principal));
        return ResponseEntity.noContent().build();
    }

    private String extractUsername(UserDetails principal) {
        if (principal == null) {
            throw new UnauthorizedException("Unauthorized user");
        }
        return principal.getUsername();
    }
}
