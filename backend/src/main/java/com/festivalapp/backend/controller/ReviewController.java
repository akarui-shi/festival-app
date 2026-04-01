package com.festivalapp.backend.controller;

import com.festivalapp.backend.dto.ReviewCreateRequest;
import com.festivalapp.backend.dto.ReviewResponse;
import com.festivalapp.backend.dto.ReviewStatusUpdateRequest;
import com.festivalapp.backend.dto.ReviewUpdateRequest;
import com.festivalapp.backend.exception.UnauthorizedException;
import com.festivalapp.backend.service.ReviewService;
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
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    @PostMapping
    public ResponseEntity<ReviewResponse> create(@Valid @RequestBody ReviewCreateRequest request,
                                                 @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(reviewService.create(request, extractUsername(principal)));
    }

    @GetMapping("/event/{eventId}")
    public ResponseEntity<List<ReviewResponse>> getByEvent(@PathVariable Long eventId) {
        return ResponseEntity.ok(reviewService.getApprovedByEvent(eventId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ReviewResponse> update(@PathVariable Long id,
                                                 @Valid @RequestBody ReviewUpdateRequest request,
                                                 @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(reviewService.update(
            id,
            request.getRating(),
            request.getText(),
            extractUsername(principal)
        ));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable Long id,
                                                      @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(reviewService.delete(id, extractUsername(principal)));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ReviewResponse> updateStatus(@PathVariable Long id,
                                                       @Valid @RequestBody ReviewStatusUpdateRequest request) {
        return ResponseEntity.ok(reviewService.updateStatus(id, request.getStatus()));
    }

    private String extractUsername(UserDetails principal) {
        if (principal == null) {
            throw new UnauthorizedException("Unauthorized user");
        }
        return principal.getUsername();
    }
}
