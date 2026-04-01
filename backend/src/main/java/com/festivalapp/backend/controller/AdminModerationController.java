package com.festivalapp.backend.controller;

import com.festivalapp.backend.dto.EventShortResponse;
import com.festivalapp.backend.dto.EventStatusUpdateRequest;
import com.festivalapp.backend.dto.PublicationShortResponse;
import com.festivalapp.backend.entity.EventStatus;
import com.festivalapp.backend.entity.PublicationStatus;
import com.festivalapp.backend.service.EventService;
import com.festivalapp.backend.service.PublicationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminModerationController {

    private final PublicationService publicationService;
    private final EventService eventService;

    @GetMapping("/publications")
    public ResponseEntity<List<PublicationShortResponse>> getPublications(@RequestParam(required = false) PublicationStatus status) {
        return ResponseEntity.ok(publicationService.getAllForAdmin(status));
    }

    @GetMapping("/events")
    public ResponseEntity<List<EventShortResponse>> getEvents(@RequestParam(required = false) EventStatus status) {
        return ResponseEntity.ok(eventService.getAllForAdmin(status));
    }

    @PatchMapping("/events/{id}/status")
    public ResponseEntity<EventShortResponse> updateEventStatus(@PathVariable Long id,
                                                                @Valid @RequestBody EventStatusUpdateRequest request) {
        return ResponseEntity.ok(eventService.updateStatusByAdmin(id, request.getStatus()));
    }
}
