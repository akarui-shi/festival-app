package com.festivalapp.backend.config;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@Order(4)
@RequiredArgsConstructor
public class RegistrationSchemaInitializer implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        if (!registrationsTableExists()) {
            return;
        }

        // Normalize legacy values before re-creating status constraint.
        jdbcTemplate.update("""
            update registrations
            set status = 'CREATED'
            where status is null or status not in ('CREATED', 'CONFIRMED', 'CANCELLED')
            """);

        List<String> statusConstraints = jdbcTemplate.queryForList("""
            select c.conname
            from pg_constraint c
            join pg_class t on t.oid = c.conrelid
            where t.relname = 'registrations'
              and c.contype = 'c'
              and pg_get_constraintdef(c.oid) ilike '%status%'
            """, String.class);

        for (String constraintName : statusConstraints) {
            jdbcTemplate.execute("alter table registrations drop constraint if exists " + quoteIdentifier(constraintName));
        }

        jdbcTemplate.execute("""
            alter table registrations
            add constraint registrations_status_check
            check (status in ('CREATED', 'CONFIRMED', 'CANCELLED'))
            """);
    }

    private boolean registrationsTableExists() {
        Boolean exists = jdbcTemplate.queryForObject("""
            select exists(
                select 1
                from information_schema.tables
                where table_schema = current_schema()
                  and table_name = 'registrations'
            )
            """, Boolean.class);
        return Boolean.TRUE.equals(exists);
    }

    private String quoteIdentifier(String identifier) {
        return "\"" + identifier.replace("\"", "\"\"") + "\"";
    }
}

