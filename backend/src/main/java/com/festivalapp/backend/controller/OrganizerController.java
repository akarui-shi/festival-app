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

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

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

    @GetMapping("/events/{id}/attendees/export.xlsx")
    public ResponseEntity<byte[]> exportAttendeesExcel(@PathVariable Long id,
                                                       @AuthenticationPrincipal UserDetails principal) {
        if (principal == null) {
            throw new UnauthorizedException("Unauthorized user");
        }
        eventService.getOrganizerEventById(id, principal.getUsername());
        List<AttendeeExportRow> rows = buildAttendeeRows(id);

        byte[] bytes = buildXlsx(rows);
        String filename = "attendees-event-" + id + ".xlsx";

        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
            .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
            .body(bytes);
    }

    private byte[] buildXlsx(List<AttendeeExportRow> rows) {
        try {
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            try (ZipOutputStream zip = new ZipOutputStream(output, StandardCharsets.UTF_8)) {
                addZipEntry(zip, "[Content_Types].xml", """
                    <?xml version="1.0" encoding="UTF-8"?>
                    <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
                      <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
                      <Default Extension="xml" ContentType="application/xml"/>
                      <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
                      <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
                      <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
                    </Types>
                    """);
                addZipEntry(zip, "_rels/.rels", """
                    <?xml version="1.0" encoding="UTF-8"?>
                    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
                      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
                    </Relationships>
                    """);
                addZipEntry(zip, "xl/workbook.xml", """
                    <?xml version="1.0" encoding="UTF-8"?>
                    <workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
                      <sheets>
                        <sheet name="Участники" sheetId="1" r:id="rId1"/>
                      </sheets>
                    </workbook>
                    """);
                addZipEntry(zip, "xl/_rels/workbook.xml.rels", """
                    <?xml version="1.0" encoding="UTF-8"?>
                    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
                      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
                      <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
                    </Relationships>
                    """);
                addZipEntry(zip, "xl/styles.xml", """
                    <?xml version="1.0" encoding="UTF-8"?>
                    <styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
                      <fonts count="2"><font/><font><b/></font></fonts>
                      <fills count="1"><fill><patternFill patternType="none"/></fill></fills>
                      <borders count="1"><border/></borders>
                      <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
                      <cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" applyFont="1"/></cellXfs>
                    </styleSheet>
                    """);
                addZipEntry(zip, "xl/worksheets/sheet1.xml", buildWorksheetXml(rows));
            }
            return output.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("Failed to build Excel export", e);
        }
    }

    private String buildWorksheetXml(List<AttendeeExportRow> rows) {
        StringBuilder xml = new StringBuilder();
        xml.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n")
            .append("<worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">\n")
            .append("  <cols><col min=\"1\" max=\"1\" width=\"28\" customWidth=\"1\"/><col min=\"2\" max=\"2\" width=\"30\" customWidth=\"1\"/><col min=\"3\" max=\"3\" width=\"48\" customWidth=\"1\"/><col min=\"4\" max=\"4\" width=\"20\" customWidth=\"1\"/><col min=\"5\" max=\"5\" width=\"18\" customWidth=\"1\"/><col min=\"6\" max=\"6\" width=\"10\" customWidth=\"1\"/></cols>\n")
            .append("  <sheetData>\n")
            .append("    <row r=\"1\">");
        String[] headers = {"ФИО", "Email", "Сессия", "Дата начала", "Статус билета", "Билетов"};
        for (int col = 0; col < headers.length; col += 1) {
            appendTextCell(xml, col, 1, headers[col], true);
        }
        xml.append("</row>\n");

        for (int rowIndex = 0; rowIndex < rows.size(); rowIndex += 1) {
            AttendeeExportRow row = rows.get(rowIndex);
            int excelRow = rowIndex + 2;
            xml.append("    <row r=\"").append(excelRow).append("\">");
            appendTextCell(xml, 0, excelRow, row.fullName(), false);
            appendTextCell(xml, 1, excelRow, row.email(), false);
            appendTextCell(xml, 2, excelRow, row.session(), false);
            appendTextCell(xml, 3, excelRow, row.startAt(), false);
            appendTextCell(xml, 4, excelRow, row.ticketStatus(), false);
            appendNumberCell(xml, 5, excelRow, row.ticketsCount());
            xml.append("</row>\n");
        }

        xml.append("  </sheetData>\n</worksheet>\n");
        return xml.toString();
    }

    private static void addZipEntry(ZipOutputStream zip, String name, String content) throws IOException {
        zip.putNextEntry(new ZipEntry(name));
        zip.write(content.stripLeading().getBytes(StandardCharsets.UTF_8));
        zip.closeEntry();
    }

    private static void appendTextCell(StringBuilder xml, int colIndex, int rowIndex, String value, boolean header) {
        xml.append("<c r=\"").append(cellRef(colIndex, rowIndex)).append("\" t=\"inlineStr\"");
        if (header) {
            xml.append(" s=\"1\"");
        }
        xml.append("><is><t>").append(escapeXml(value)).append("</t></is></c>");
    }

    private static void appendNumberCell(StringBuilder xml, int colIndex, int rowIndex, int value) {
        xml.append("<c r=\"").append(cellRef(colIndex, rowIndex)).append("\"><v>").append(value).append("</v></c>");
    }

    private static String cellRef(int colIndex, int rowIndex) {
        StringBuilder col = new StringBuilder();
        int current = colIndex;
        do {
            col.insert(0, (char) ('A' + (current % 26)));
            current = current / 26 - 1;
        } while (current >= 0);
        return col.append(rowIndex).toString();
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

    private static String escapeXml(String value) {
        if (value == null) return "";
        return value.trim()
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&apos;");
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
