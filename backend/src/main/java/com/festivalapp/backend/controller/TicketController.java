package com.festivalapp.backend.controller;

import com.festivalapp.backend.dto.TicketResponse;
import com.festivalapp.backend.exception.UnauthorizedException;
import com.festivalapp.backend.service.TicketService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
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
    public ResponseEntity<List<TicketResponse>> getMine(@AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(ticketService.getMyTickets(extractUsername(principal)));
    }

    @PostMapping("/{id}/use")
    public ResponseEntity<TicketResponse> useTicket(@PathVariable Long id,
                                                    @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(ticketService.useTicket(id, extractUsername(principal)));
    }

    private String extractUsername(UserDetails principal) {
        if (principal == null) {
            throw new UnauthorizedException("Unauthorized user");
        }
        return principal.getUsername();
    }
}
