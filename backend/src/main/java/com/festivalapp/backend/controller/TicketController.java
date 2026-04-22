package com.festivalapp.backend.controller;

import com.festivalapp.backend.dto.TicketResponse;
import com.festivalapp.backend.exception.UnauthorizedException;
import com.festivalapp.backend.service.TicketService;
import lombok.RequiredArgsConstructor;
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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
public class TicketController {

    private final TicketService ticketService;

    @GetMapping("/my")
    public ResponseEntity<List<TicketResponse>> getMine(Authentication authentication) {
        return ResponseEntity.ok(ticketService.getMyTickets(extractUserIdentifier(authentication)));
    }

    @PostMapping("/{id}/use")
    public ResponseEntity<TicketResponse> useTicket(@PathVariable Long id,
                                                    Authentication authentication) {
        return ResponseEntity.ok(ticketService.useTicket(id, extractUserIdentifier(authentication)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<TicketResponse> refundTicket(@PathVariable Long id,
                                                       Authentication authentication) {
        return ResponseEntity.ok(ticketService.refundTicket(id, extractUserIdentifier(authentication)));
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
}
