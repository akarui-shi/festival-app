package com.festivalapp.backend.controller;

import com.festivalapp.backend.dto.PublicationShortResponse;
import com.festivalapp.backend.dto.ReviewResponse;
import com.festivalapp.backend.entity.PublicationStatus;
import com.festivalapp.backend.entity.ReviewStatus;
import com.festivalapp.backend.service.PublicationService;
import com.festivalapp.backend.service.ReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminModerationController {

    private final ReviewService reviewService;
    private final PublicationService publicationService;

    @GetMapping("/reviews")
    public ResponseEntity<List<ReviewResponse>> getReviews(@RequestParam(required = false) ReviewStatus status) {
        return ResponseEntity.ok(reviewService.getAllForAdmin(status));
    }

    @GetMapping("/publications")
    public ResponseEntity<List<PublicationShortResponse>> getPublications(@RequestParam(required = false) PublicationStatus status) {
        return ResponseEntity.ok(publicationService.getAllForAdmin(status));
    }
}
