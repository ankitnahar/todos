# Database Changes for Nested Sub-Notes Feature

## Tables Created by JPA

### sub_notes table
```sql
CREATE TABLE sub_notes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    header VARCHAR(255) NOT NULL,
    description TEXT,
    note_id BIGINT,
    display_order INT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
);
```

### notes table - New column
```sql
ALTER TABLE notes ADD COLUMN nested BOOLEAN DEFAULT FALSE;
```

## Notes
- All existing notes will have `nested = false` by default
- No data will be lost during migration
- JPA will automatically create these structures when you run the application
