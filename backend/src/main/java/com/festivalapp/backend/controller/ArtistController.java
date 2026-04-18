package com.festivalapp.backend.controller;

import com.festivalapp.backend.dto.ArtistDetailsResponse;
import com.festivalapp.backend.dto.ArtistSummaryResponse;
import com.festivalapp.backend.dto.ArtistUpsertRequest;
import com.festivalapp.backend.exception.UnauthorizedException;
import com.festivalapp.backend.service.ArtistService;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/artists")
@RequiredArgsConstructor
public class ArtistController {

    private final ArtistService artistService;

    @GetMapping
    public ResponseEntity<List<ArtistSummaryResponse>> getAll(@RequestParam(required = false) String q) {
        return ResponseEntity.ok(artistService.getPublicList(q));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ArtistDetailsResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(artistService.getPublicById(id));
    }

    @PostMapping
    public ResponseEntity<ArtistSummaryResponse> create(@Valid @RequestBody ArtistUpsertRequest request,
                                                        @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(artistService.create(request, extractUsername(principal)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ArtistSummaryResponse> update(@PathVariable Long id,
                                                        @Valid @RequestBody ArtistUpsertRequest request,
                                                        @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(artistService.update(id, request, extractUsername(principal)));
    }

    private String extractUsername(UserDetails principal) {
        if (principal == null) {
            throw new UnauthorizedException("Unauthorized user");
        }
        return principal.getUsername();
    }
}
