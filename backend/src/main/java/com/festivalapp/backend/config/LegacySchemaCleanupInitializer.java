package com.festivalapp.backend.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@Order(5)
@RequiredArgsConstructor
public class LegacySchemaCleanupInitializer implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        try {
            cleanupSessionsTable();
            cleanupReviewsTable();
        } catch (Exception ex) {
            log.warn("Could not cleanup legacy schema columns", ex);
        }
    }

    private void cleanupSessionsTable() {
        if (!tableExists("sessions")) {
            return;
        }
        dropColumnIfExists("sessions", "venue_id");
        dropColumnIfExists("sessions", "title");
        dropColumnIfExists("sessions", "description");
    }

    private void cleanupReviewsTable() {
        if (!tableExists("reviews")) {
            return;
        }
        dropColumnIfExists("reviews", "status");
    }

    private void dropColumnIfExists(String tableName, String columnName) {
        String sql = "alter table " + quoteIdentifier(tableName)
            + " drop column if exists " + quoteIdentifier(columnName) + " cascade";
        jdbcTemplate.execute(sql);
    }

    private boolean tableExists(String tableName) {
        Boolean exists = jdbcTemplate.queryForObject("""
            select exists(
                select 1
                from information_schema.tables
                where table_schema = current_schema()
                  and table_name = ?
            )
            """, Boolean.class, tableName);
        return Boolean.TRUE.equals(exists);
    }

    private String quoteIdentifier(String identifier) {
        return "\"" + identifier.replace("\"", "\"\"") + "\"";
    }
}
