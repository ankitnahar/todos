package com.example.noteapp.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataMigration implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        migrateSubNoteParents();
    }

    private void migrateSubNoteParents() {
        try {
            // Check if the old note_id column exists in sub_notes
            var columns = jdbcTemplate.queryForList(
                "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'SUB_NOTES' AND COLUMN_NAME = 'NOTE_ID'"
            );
            if (columns.isEmpty()) return;

            // Migrate data from old note_id FK to new join table
            int migrated = jdbcTemplate.update(
                "INSERT INTO NOTE_SUB_NOTES (NOTE_ID, SUB_NOTE_ID) " +
                "SELECT s.NOTE_ID, s.ID FROM SUB_NOTES s " +
                "WHERE s.NOTE_ID IS NOT NULL " +
                "AND NOT EXISTS (SELECT 1 FROM NOTE_SUB_NOTES ns WHERE ns.SUB_NOTE_ID = s.ID AND ns.NOTE_ID = s.NOTE_ID)"
            );
            if (migrated > 0) {
                log.info("Migrated {} sub-note parent links to join table", migrated);
            }
        } catch (Exception e) {
            log.debug("Sub-note migration skipped: {}", e.getMessage());
        }
    }
}
