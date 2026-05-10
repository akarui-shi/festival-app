package com.festivalapp.backend.controller;

import com.festivalapp.backend.dto.EventDetailsResponse;
import com.festivalapp.backend.dto.OrganizerEventStatsResponse;
import com.festivalapp.backend.dto.EventShortResponse;
import com.festivalapp.backend.dto.WaitlistEntryResponse;
import com.festivalapp.backend.entity.Session;
import com.festivalapp.backend.entity.Ticket;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.exception.UnauthorizedException;
import com.festivalapp.backend.repository.SessionRepository;
import com.festivalapp.backend.repository.TicketRepository;
import com.festivalapp.backend.service.EventService;
import com.festivalapp.backend.service.WaitlistService;
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
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/organizer")
@RequiredArgsConstructor
public class OrganizerController {

    private static final DateTimeFormatter CSV_DT = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm");

    private final EventService eventService;
    private final WaitlistService waitlistService;
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

    @GetMapping("/events/{id}/waitlist")
    public ResponseEntity<List<WaitlistEntryResponse>> getEventWaitlist(@PathVariable Long id,
                                                                        @AuthenticationPrincipal UserDetails principal) {
        if (principal == null) {
            throw new UnauthorizedException("Unauthorized user");
        }
        eventService.getOrganizerEventById(id, principal.getUsername());
        return ResponseEntity.ok(waitlistService.getEventWaitlistEntries(id));
    }

    @GetMapping("/events/{id}/attendees/export")
    public ResponseEntity<byte[]> exportAttendees(@PathVariable Long id,
                                                  @AuthenticationPrincipal UserDetails principal) {
        if (principal == null) {
            throw new UnauthorizedException("Unauthorized user");
        }
        eventService.getOrganizerEventById(id, principal.getUsername());
        List<AttendeeExportRow> rows = buildAttendeeRows(id);

        StringBuilder csv = new StringBuilder("﻿");
        csv.append("ФИО,Email,Сессия,Дата начала,Статус билета,Билетов\n");

        for (AttendeeExportRow row : rows) {
            csv.append(escape(row.fullName())).append(',')
               .append(escape(row.email())).append(',')
               .append(escape(row.session())).append(',')
               .append(row.startAt()).append(',')
               .append(row.ticketStatus()).append(',')
               .append(row.ticketsCount()).append('\n');
        }

        byte[] bytes = csv.toString().getBytes(StandardCharsets.UTF_8);
        String filename = "attendees-event-" + id + ".csv";

        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
            .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
            .body(bytes);
    }

    @GetMapping("/events/{id}/attendees/export.json")
    public ResponseEntity<List<AttendeeExportRow>> exportAttendeesJson(@PathVariable Long id,
                                                                       @AuthenticationPrincipal UserDetails principal) {
        if (principal == null) {
            throw new UnauthorizedException("Unauthorized user");
        }
        eventService.getOrganizerEventById(id, principal.getUsername());
        String filename = "attendees-event-" + id + ".json";
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
            .contentType(MediaType.APPLICATION_JSON)
            .body(buildAttendeeRows(id));
    }

    private List<AttendeeExportRow> buildAttendeeRows(Long eventId) {
        List<Session> sessions = sessionRepository.findAllByEventIdOrderByStartsAtAsc(eventId);
        Map<String, MutableAttendeeRow> grouped = new LinkedHashMap<>();

        for (Session session : sessions) {
            String sessionLabel = StringUtils.hasText(session.getSessionTitle())
                ? session.getSessionTitle().trim()
                : "Сессия #" + session.getId();
            String startAt = session.getStartsAt() != null
                ? session.getStartsAt().toLocalDateTime().format(CSV_DT)
                : "";

            List<Ticket> tickets = ticketRepository.findAllBySessionIdOrderByIssuedAtDesc(session.getId());
            for (Ticket ticket : tickets) {
                User user = ticket.getUser();
                String key = session.getId() + ":" + attendeeKey(ticket);
                MutableAttendeeRow row = grouped.computeIfAbsent(key, ignored -> new MutableAttendeeRow(
                    user != null ? (trim(user.getFirstName()) + " " + trim(user.getLastName())).trim() : "",
                    user != null && StringUtils.hasText(user.getEmail()) ? user.getEmail().trim() : "",
                    sessionLabel,
                    startAt,
                    ticket.getStatus() != null ? ticket.getStatus() : ""
                ));
                row.add(ticket.getStatus());
            }
        }

        List<AttendeeExportRow> result = new ArrayList<>();
        grouped.values().forEach(row -> result.add(row.toExportRow()));
        return result;
    }

    private String attendeeKey(Ticket ticket) {
        if (ticket.getOrderItem() != null
            && ticket.getOrderItem().getOrder() != null
            && ticket.getOrderItem().getOrder().getId() != null) {
            return "order:" + ticket.getOrderItem().getOrder().getId();
        }
        if (ticket.getUser() != null && ticket.getUser().getId() != null) {
            return "user:" + ticket.getUser().getId();
        }
        return "ticket:" + ticket.getId();
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

    public record AttendeeExportRow(
        String fullName,
        String email,
        String session,
        String startAt,
        String ticketStatus,
        int ticketsCount
    ) {
    }

    private static final class MutableAttendeeRow {
        private final String fullName;
        private final String email;
        private final String session;
        private final String startAt;
        private String ticketStatus;
        private int ticketsCount = 0;

        private MutableAttendeeRow(String fullName, String email, String session, String startAt, String ticketStatus) {
            this.fullName = fullName;
            this.email = email;
            this.session = session;
            this.startAt = startAt;
            this.ticketStatus = ticketStatus;
        }

        private void add(String status) {
            ticketsCount += 1;
            if ("активен".equals(status)) {
                ticketStatus = status;
            }
        }

        private AttendeeExportRow toExportRow() {
            return new AttendeeExportRow(fullName, email, session, startAt, ticketStatus, ticketsCount);
        }
    }

}
