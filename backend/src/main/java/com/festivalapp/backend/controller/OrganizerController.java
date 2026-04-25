package com.festivalapp.backend.controller;

import com.festivalapp.backend.dto.EventDetailsResponse;
import com.festivalapp.backend.dto.OrganizerEventStatsResponse;
import com.festivalapp.backend.dto.EventShortResponse;
import com.festivalapp.backend.entity.Session;
import com.festivalapp.backend.entity.Ticket;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.exception.UnauthorizedException;
import com.festivalapp.backend.repository.SessionRepository;
import com.festivalapp.backend.repository.TicketRepository;
import com.festivalapp.backend.service.EventService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.List;

@RestController
@RequestMapping("/api/organizer")
@RequiredArgsConstructor
public class OrganizerController {

    private static final DateTimeFormatter CSV_DT = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm");

    private final EventService eventService;
    private final SessionRepository sessionRepository;
    private final TicketRepository ticketRepository;

    @GetMapping("/events")
    public ResponseEntity<List<EventShortResponse>> getOrganizerEvents(@AuthenticationPrincipal UserDetails principal) {
        if (principal == null) {
            throw new UnauthorizedException("Unauthorized user");
        }
        return ResponseEntity.ok(eventService.getOrganizerEvents(principal.getUsername()));
    }

    @GetMapping("/events/{id}")
    public ResponseEntity<EventDetailsResponse> getOrganizerEventById(@PathVariable Long id,
                                                                      @AuthenticationPrincipal UserDetails principal) {
        if (principal == null) {
            throw new UnauthorizedException("Unauthorized user");
        }
        return ResponseEntity.ok(eventService.getOrganizerEventById(id, principal.getUsername()));
    }

    @GetMapping("/events/{id}/stats")
    public ResponseEntity<OrganizerEventStatsResponse> getOrganizerEventStats(@PathVariable Long id,
                                                                               @AuthenticationPrincipal UserDetails principal) {
        if (principal == null) {
            throw new UnauthorizedException("Unauthorized user");
        }
        return ResponseEntity.ok(eventService.getOrganizerEventStats(id, principal.getUsername()));
    }

    @GetMapping("/events/{id}/attendees/export")
    public ResponseEntity<byte[]> exportAttendees(@PathVariable Long id,
                                                  @AuthenticationPrincipal UserDetails principal) {
        if (principal == null) {
            throw new UnauthorizedException("Unauthorized user");
        }

        List<Session> sessions = sessionRepository.findAllByEventIdOrderByStartsAtAsc(id);

        StringBuilder csv = new StringBuilder("﻿");
        csv.append("ФИО,Email,Сессия,Дата начала,Статус билета\n");

        for (Session session : sessions) {
            String sessionLabel = StringUtils.hasText(session.getSessionTitle())
                ? escape(session.getSessionTitle())
                : "Сессия #" + session.getId();
            String startAt = session.getStartsAt() != null
                ? session.getStartsAt().toLocalDateTime().format(CSV_DT)
                : "";

            List<Ticket> tickets = ticketRepository.findAllBySessionIdOrderByIssuedAtDesc(session.getId());
            for (Ticket ticket : tickets) {
                User user = ticket.getUser();
                String fullName = user != null
                    ? escape(trim(user.getFirstName()) + " " + trim(user.getLastName()))
                    : "";
                String email = user != null && StringUtils.hasText(user.getEmail()) ? user.getEmail().trim() : "";
                csv.append(fullName).append(',')
                   .append(email).append(',')
                   .append(sessionLabel).append(',')
                   .append(startAt).append(',')
                   .append(ticket.getStatus() != null ? ticket.getStatus() : "").append('\n');
            }
        }

        byte[] bytes = csv.toString().getBytes(StandardCharsets.UTF_8);
        String filename = "attendees-event-" + id + ".csv";

        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
            .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
            .body(bytes);
    }

    private static String escape(String value) {
        if (value == null) return "";
        String s = value.trim();
        if (s.contains(",") || s.contains("\"") || s.contains("\n")) {
            return "\"" + s.replace("\"", "\"\"") + "\"";
        }
        return s;
    }

    private static String trim(String value) {
        return value != null ? value.trim() : "";
    }

}
