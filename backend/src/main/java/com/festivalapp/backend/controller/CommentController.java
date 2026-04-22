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
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.util.StringUtils;
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
                                                  Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(commentService.create(request, extractUserIdentifier(authentication)));
    }

    @GetMapping("/event/{eventId}")
    public ResponseEntity<List<CommentResponse>> getByEvent(@PathVariable Long eventId,
                                                            @RequestParam(defaultValue = "false") boolean includeUnmoderated,
                                                            Authentication authentication) {
        boolean allowUnmoderated = includeUnmoderated && hasAdminRole(authentication);
        return ResponseEntity.ok(commentService.getByEvent(eventId, allowUnmoderated));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CommentResponse> update(@PathVariable Long id,
                                                  @Valid @RequestBody CommentUpdateRequest request,
                                                  Authentication authentication) {
        return ResponseEntity.ok(commentService.update(id, request, extractUserIdentifier(authentication)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable Long id,
                                                      Authentication authentication) {
        return ResponseEntity.ok(commentService.delete(id, extractUserIdentifier(authentication)));
    }

    private String extractUserIdentifier(Authentication authentication) {
        if (authentication == null
            || !authentication.isAuthenticated()
            || authentication instanceof AnonymousAuthenticationToken) {
            throw new UnauthorizedException("Unauthorized user");
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof UserDetails userDetails && StringUtils.hasText(userDetails.getUsername())) {
            return userDetails.getUsername();
        }
        if (principal instanceof OAuth2User oauth2User) {
            String email = oauth2User.getAttribute("email");
            if (StringUtils.hasText(email)) {
                return email;
            }
            String defaultEmail = oauth2User.getAttribute("default_email");
            if (StringUtils.hasText(defaultEmail)) {
                return defaultEmail;
            }
            if (StringUtils.hasText(oauth2User.getName())) {
                return oauth2User.getName();
            }
        }
        if (principal instanceof String principalString && StringUtils.hasText(principalString)
            && !"anonymousUser".equalsIgnoreCase(principalString)) {
            return principalString;
        }
        if (StringUtils.hasText(authentication.getName())
            && !"anonymousUser".equalsIgnoreCase(authentication.getName())) {
            return authentication.getName();
        }

        throw new UnauthorizedException("Unauthorized user");
    }

    private boolean hasAdminRole(Authentication authentication) {
        return authentication != null
            && authentication.getAuthorities() != null
            && authentication.getAuthorities().stream().anyMatch(auth -> "ROLE_ADMIN".equals(auth.getAuthority()));
    }
}
