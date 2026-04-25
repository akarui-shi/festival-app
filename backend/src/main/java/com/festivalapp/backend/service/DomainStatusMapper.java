package com.festivalapp.backend.service;

import com.festivalapp.backend.entity.EventStatus;
import com.festivalapp.backend.entity.PublicationStatus;
import com.festivalapp.backend.entity.RegistrationStatus;

public final class DomainStatusMapper {

    private DomainStatusMapper() {
    }

    public static String toEventDbStatus(EventStatus status) {
        if (status == null) {
            return "черновик";
        }
        return switch (status) {
            case DRAFT -> "черновик";
            case PENDING_APPROVAL -> "на_рассмотрении";
            case PUBLISHED -> "опубликовано";
            case ARCHIVED -> "завершено";
            case REJECTED -> "отклонено";
            case CANCELLED -> "отменено";
        };
    }

    public static EventStatus toEventStatus(String dbStatus) {
        if (dbStatus == null) {
            return EventStatus.DRAFT;
        }
        return switch (dbStatus) {
            case "черновик" -> EventStatus.DRAFT;
            case "на_рассмотрении" -> EventStatus.PENDING_APPROVAL;
            case "опубликовано" -> EventStatus.PUBLISHED;
            case "завершено" -> EventStatus.ARCHIVED;
            case "отклонено" -> EventStatus.REJECTED;
            case "отменено" -> EventStatus.CANCELLED;
            default -> EventStatus.DRAFT;
        };
    }

    public static String toPublicationDbStatus(PublicationStatus status) {
        if (status == null) {
            return PublicationStatus.PENDING.name();
        }
        return status.name();
    }

    public static PublicationStatus toPublicationStatus(String dbStatus) {
        if (dbStatus == null || dbStatus.isBlank()) {
            return PublicationStatus.PENDING;
        }

        try {
            return PublicationStatus.valueOf(dbStatus);
        } catch (IllegalArgumentException ignored) {
            return switch (dbStatus) {
                case "опубликовано" -> PublicationStatus.PUBLISHED;
                case "отклонено" -> PublicationStatus.REJECTED;
                default -> PublicationStatus.PENDING;
            };
        }
    }

    public static RegistrationStatus toRegistrationStatus(String ticketStatus) {
        if (ticketStatus == null) {
            return RegistrationStatus.CREATED;
        }
        if ("возвращён".equalsIgnoreCase(ticketStatus) || "cancelled".equalsIgnoreCase(ticketStatus)) {
            return RegistrationStatus.CANCELLED;
        }
        return RegistrationStatus.CREATED;
    }
}
