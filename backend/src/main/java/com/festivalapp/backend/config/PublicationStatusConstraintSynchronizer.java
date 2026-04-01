package com.festivalapp.backend.config;

import com.festivalapp.backend.entity.PublicationStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class PublicationStatusConstraintSynchronizer implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        try {
            if (!publicationsTableExists()) {
                return;
            }

            dropLegacyStatusCheckConstraints();
            createCurrentStatusConstraint();
        } catch (Exception ex) {
            log.warn("Could not synchronize publications status check constraint", ex);
        }
    }

    private boolean publicationsTableExists() {
        Integer count = jdbcTemplate.queryForObject(
            "select count(*) from information_schema.tables where table_schema = current_schema() and table_name = 'publications'",
            Integer.class
        );
        return count != null && count > 0;
    }

    private void dropLegacyStatusCheckConstraints() {
        List<String> constraints = jdbcTemplate.query(
            """
                select c.conname
                from pg_constraint c
                join pg_class t on t.oid = c.conrelid
                join pg_namespace n on n.oid = t.relnamespace
                where t.relname = 'publications'
                  and n.nspname = current_schema()
                  and c.contype = 'c'
                  and lower(pg_get_constraintdef(c.oid)) like '%status%'
                """,
            (rs, rowNum) -> rs.getString("conname")
        );

        for (String constraint : constraints) {
            String escaped = quoteIdentifier(constraint);
            jdbcTemplate.execute("alter table publications drop constraint if exists " + escaped);
            log.info("Dropped legacy publications status constraint: {}", constraint);
        }
    }

    private void createCurrentStatusConstraint() {
        String allowedStatuses = Arrays.stream(PublicationStatus.values())
            .map(PublicationStatus::name)
            .map(value -> "'" + value.toUpperCase(Locale.ROOT) + "'")
            .collect(Collectors.joining(", "));

        jdbcTemplate.execute(
            "alter table publications add constraint publications_status_check check (status in (" + allowedStatuses + "))"
        );
        log.info("Created publications_status_check with statuses: {}", allowedStatuses);
    }

    private String quoteIdentifier(String value) {
        return "\"" + value.replace("\"", "\"\"") + "\"";
    }
}
