package com.festivalapp.backend.entity;

import java.util.Locale;

public enum RoleName {
    ROLE_RESIDENT,
    ROLE_ORGANIZER,
    ROLE_ADMIN;

    public static RoleName fromAny(String value) {
        if (value == null || value.isBlank()) {
            return ROLE_RESIDENT;
        }

        String normalized = value.trim().toUpperCase(Locale.ROOT);
        if (!normalized.startsWith("ROLE_")) {
            normalized = "ROLE_" + normalized;
        }

        return switch (normalized) {
            case "ROLE_RESIDENT", "ROLE_ЖИТЕЛЬ" -> ROLE_RESIDENT;
            case "ROLE_ORGANIZER", "ROLE_ORGANISER", "ROLE_ОРГАНИЗАТОР" -> ROLE_ORGANIZER;
            case "ROLE_ADMIN", "ROLE_ADMINISTRATOR", "ROLE_АДМИНИСТРАТОР" -> ROLE_ADMIN;
            default -> throw new IllegalArgumentException("Unknown role: " + value);
        };
    }

    public static RoleName fromDbName(String dbName) {
        if (dbName == null || dbName.isBlank()) {
            return ROLE_RESIDENT;
        }

        return switch (dbName.trim()) {
            case "Житель" -> ROLE_RESIDENT;
            case "Организатор" -> ROLE_ORGANIZER;
            case "Администратор" -> ROLE_ADMIN;
            default -> fromAny(dbName);
        };
    }

    public String toDbName() {
        return switch (this) {
            case ROLE_RESIDENT -> "Житель";
            case ROLE_ORGANIZER -> "Организатор";
            case ROLE_ADMIN -> "Администратор";
        };
    }

    public String toApiName() {
        return name().replace("ROLE_", "");
    }
}
