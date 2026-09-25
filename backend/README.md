# Notes Management Backend

Spring Boot 3.x backend for the Notes management application.

## Prerequisites

- Java 17 or higher
- Maven 3.6 or higher

## Database Setup

The application connects to an existing H2 database file at `./data/todo.mv.db`. Make sure the database file is present before starting the application.

## Running the Application

```bash
mvn spring-boot:run
```

The application will start on port 8080.

## API Endpoints

### Buckets
- `GET /api/buckets` - Get all buckets
- `GET /api/buckets/{id}` - Get bucket by ID
- `POST /api/buckets` - Create new bucket
- `PUT /api/buckets/{id}` - Update bucket
- `DELETE /api/buckets/{id}` - Delete bucket
- `GET /api/buckets/view` - Get consolidated bucket view

### Tags
- `GET /api/tags` - Get all tags
- `GET /api/tags/{id}` - Get tag by ID
- `POST /api/tags` - Create new tag
- `PUT /api/tags/{id}` - Update tag
- `DELETE /api/tags/{id}` - Delete tag

### Team Members
- `GET /api/team-members` - Get all team members
- `GET /api/team-members/{id}` - Get team member by ID
- `POST /api/team-members` - Create new team member
- `PUT /api/team-members/{id}` - Update team member
- `DELETE /api/team-members/{id}` - Delete team member

### Notes
- `GET /api/notes` - Get all notes (with filters)
- `GET /api/notes/{id}` - Get note by ID with subnotes
- `POST /api/notes` - Create new note
- `PUT /api/notes/{id}` - Update note
- `DELETE /api/notes/{id}` - Soft delete note
- `POST /api/notes/{id}/toggle-favorite` - Toggle favorite status
- `POST /api/notes/{id}/toggle-hot-topic` - Toggle hot topic status
- `POST /api/notes/{id}/track-today` - Track note today
- `POST /api/notes/{id}/untrack-today` - Untrack note
- `POST /api/notes/{id}/move-bucket` - Move note to bucket
- `POST /api/notes/{id}/duplicate` - Duplicate note
- `GET /api/notes/deleted` - Get deleted notes
- `POST /api/notes/{id}/restore` - Restore deleted note
- `DELETE /api/notes/{id}/hard-delete` - Permanently delete note
- `GET /api/notes/hot-topics` - Get all hot topic items
- `GET /api/notes/stats` - Get statistics

### SubNotes
- `POST /api/notes/{id}/subnotes` - Create subnote
- `PUT /api/notes/subnotes/{subNoteId}` - Update subnote
- `DELETE /api/notes/subnotes/{subNoteId}` - Delete subnote
- `POST /api/notes/subnotes/{subNoteId}/toggle-hot-topic` - Toggle hot topic
- `POST /api/notes/subnotes/{subNoteId}/track-today` - Track subnote today
- `POST /api/notes/subnotes/{subNoteId}/untrack-today` - Untrack subnote
- `POST /api/notes/subnotes/{subNoteId}/move-bucket` - Move subnote to bucket
- `POST /api/notes/subnotes/{subNoteId}/move-note` - Move subnote to another note
- `POST /api/notes/subnotes/{subNoteId}/convert-to-note` - Convert subnote to note

### Files
- `POST /api/files/upload` - Upload file
- `GET /api/files/{id}/download` - Download file
- `GET /api/files/{id}` - Get file attachment info
- `GET /api/files/note/{noteId}` - Get files by note ID
- `GET /api/files/subnote/{subNoteId}` - Get files by subnote ID
- `DELETE /api/files/{id}` - Delete file

## H2 Console

Access the H2 console at: http://localhost:8080/h2-console

- JDBC URL: `jdbc:h2:file:./data/todo`
- Username: `sa`
- Password: (empty)

## Configuration

See `application.properties` for configuration options.
