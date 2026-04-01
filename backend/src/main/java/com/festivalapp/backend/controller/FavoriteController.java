package com.festivalapp.backend.controller;

import com.festivalapp.backend.dto.FavoriteCreateRequest;
import com.festivalapp.backend.dto.FavoriteResponse;
import com.festivalapp.backend.exception.UnauthorizedException;
import com.festivalapp.backend.service.FavoriteService;
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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/favorites")
@RequiredArgsConstructor
public class FavoriteController {

    private final FavoriteService favoriteService;

    @PostMapping
    public ResponseEntity<FavoriteResponse> create(@Valid @RequestBody FavoriteCreateRequest request,
                                                   @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(favoriteService.create(request, extractUsername(principal)));
    }

    @GetMapping("/my")
    public ResponseEntity<List<FavoriteResponse>> getMy(@AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(favoriteService.getMyFavorites(extractUsername(principal)));
    }

    @DeleteMapping("/{eventId}")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable Long eventId,
                                                      @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(favoriteService.delete(eventId, extractUsername(principal)));
    }

    private String extractUsername(UserDetails principal) {
        if (principal == null) {
            throw new UnauthorizedException("Unauthorized user");
        }
        return principal.getUsername();
    }
}
