package com.festivalapp.backend.controller;

import com.festivalapp.backend.dto.CommentCreateRequest;
import com.festivalapp.backend.dto.CommentResponse;
import com.festivalapp.backend.dto.CommentUpdateRequest;
import com.festivalapp.backend.exception.UnauthorizedException;
import com.festivalapp.backend.service.CommentService;
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
@RequestMapping("/api/comments")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    @PostMapping
    public ResponseEntity<CommentResponse> create(@Valid @RequestBody CommentCreateRequest request,
                                                  @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(commentService.create(request, extractUsername(principal)));
    }

    @GetMapping("/event/{eventId}")
    public ResponseEntity<List<CommentResponse>> getByEvent(@PathVariable Long eventId,
                                                            @RequestParam(defaultValue = "false") boolean includeUnmoderated,
                                                            @AuthenticationPrincipal UserDetails principal) {
        boolean allowUnmoderated = includeUnmoderated && hasAdminRole(principal);
        return ResponseEntity.ok(commentService.getByEvent(eventId, allowUnmoderated));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CommentResponse> update(@PathVariable Long id,
                                                  @Valid @RequestBody CommentUpdateRequest request,
                                                  @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(commentService.update(id, request, extractUsername(principal)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable Long id,
                                                      @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(commentService.delete(id, extractUsername(principal)));
    }

    private String extractUsername(UserDetails principal) {
        if (principal == null) {
            throw new UnauthorizedException("Unauthorized user");
        }
        return principal.getUsername();
    }

    private boolean hasAdminRole(UserDetails principal) {
        return principal != null
            && principal.getAuthorities() != null
            && principal.getAuthorities().stream().anyMatch(auth -> "ROLE_ADMIN".equals(auth.getAuthority()));
    }
}
