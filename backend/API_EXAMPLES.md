# API Examples and Testing Guide

## Base URL
```
http://localhost:8080
```

## 1. Buckets API

### Get all buckets
```bash
curl http://localhost:8080/api/buckets
```

### Create a bucket
```bash
curl -X POST http://localhost:8080/api/buckets \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Urgent Tasks",
    "priority": 1,
    "color": "#FF5733",
    "isDefault": false
  }'
```

### Get bucket view (consolidated)
```bash
curl http://localhost:8080/api/buckets/view
```

## 2. Tags API

### Get all tags
```bash
curl http://localhost:8080/api/tags
```

### Create a tag
```bash
curl -X POST http://localhost:8080/api/tags \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Important"
  }'
```

## 3. Team Members API

### Get all team members
```bash
curl http://localhost:8080/api/team-members
```

### Create a team member
```bash
curl -X POST http://localhost:8080/api/team-members \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe"
  }'
```

## 4. Notes API

### Get all notes
```bash
curl http://localhost:8080/api/notes
```

### Get notes with filters
```bash
# Search by keyword
curl "http://localhost:8080/api/notes?search=meeting"

# Filter by tags (any match)
curl "http://localhost:8080/api/notes?tagIds=1,2"

# Filter by tags (all must match)
curl "http://localhost:8080/api/notes?tagIds=1,2&tagMatchMode=all"

# Filter by bucket
curl "http://localhost:8080/api/notes?bucketIds=1"

# Filter by team members
curl "http://localhost:8080/api/notes?teamMemberIds=1,2"

# Filter by track status
curl "http://localhost:8080/api/notes?trackStatus=tracked"
curl "http://localhost:8080/api/notes?trackStatus=untracked"
```

### Get note by ID (with subnotes)
```bash
curl http://localhost:8080/api/notes/1
```

### Create a note
```bash
curl -X POST http://localhost:8080/api/notes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Project Planning Meeting",
    "details": "Discuss Q4 roadmap and priorities",
    "favorite": false,
    "hotTopic": true,
    "bucketId": 1,
    "tagNames": ["meeting", "planning"],
    "teamMemberIds": [1, 2],
    "subNotes": [
      {
        "header": "Agenda item 1",
        "description": "Review current progress",
        "displayOrder": 1
      },
      {
        "header": "Agenda item 2",
        "description": "Set new goals",
        "displayOrder": 2
      }
    ]
  }'
```

### Update a note
```bash
curl -X PUT http://localhost:8080/api/notes/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Project Meeting",
    "details": "Updated details",
    "favorite": true
  }'
```

### Toggle favorite
```bash
curl -X POST http://localhost:8080/api/notes/1/toggle-favorite
```

### Toggle hot topic
```bash
curl -X POST http://localhost:8080/api/notes/1/toggle-hot-topic
```

### Track today
```bash
curl -X POST http://localhost:8080/api/notes/1/track-today
```

### Untrack
```bash
curl -X POST http://localhost:8080/api/notes/1/untrack-today
```

### Move to bucket
```bash
curl -X POST http://localhost:8080/api/notes/1/move-bucket \
  -H "Content-Type: application/json" \
  -d '{
    "bucketId": 2
  }'
```

### Duplicate note
```bash
curl -X POST http://localhost:8080/api/notes/1/duplicate
```

### Soft delete
```bash
curl -X DELETE http://localhost:8080/api/notes/1
```

### Get deleted notes
```bash
curl http://localhost:8080/api/notes/deleted
```

### Restore note
```bash
curl -X POST http://localhost:8080/api/notes/1/restore
```

### Hard delete (permanent)
```bash
curl -X DELETE http://localhost:8080/api/notes/1/hard-delete
```

### Get hot topics
```bash
curl http://localhost:8080/api/notes/hot-topics
```

### Get statistics
```bash
curl http://localhost:8080/api/notes/stats
```

## 5. SubNotes API

### Create a subnote
```bash
curl -X POST http://localhost:8080/api/notes/1/subnotes \
  -H "Content-Type: application/json" \
  -d '{
    "header": "New Action Item",
    "description": "Follow up with client",
    "displayOrder": 3,
    "tagNames": ["action"],
    "teamMemberIds": [1]
  }'
```

### Update a subnote
```bash
curl -X PUT http://localhost:8080/api/notes/subnotes/1 \
  -H "Content-Type: application/json" \
  -d '{
    "header": "Updated Action Item",
    "description": "Updated description",
    "hotTopic": true
  }'
```

### Delete a subnote
```bash
curl -X DELETE http://localhost:8080/api/notes/subnotes/1
```

### Toggle subnote hot topic
```bash
curl -X POST http://localhost:8080/api/notes/subnotes/1/toggle-hot-topic
```

### Track subnote today
```bash
curl -X POST http://localhost:8080/api/notes/subnotes/1/track-today
```

### Move subnote to bucket
```bash
curl -X POST http://localhost:8080/api/notes/subnotes/1/move-bucket \
  -H "Content-Type: application/json" \
  -d '{
    "bucketId": 2
  }'
```

### Move subnote to another note
```bash
curl -X POST http://localhost:8080/api/notes/subnotes/1/move-note \
  -H "Content-Type: application/json" \
  -d '{
    "noteId": 5
  }'
```

### Convert subnote to note
```bash
curl -X POST http://localhost:8080/api/notes/subnotes/1/convert-to-note
```

## 6. Files API

### Upload a file
```bash
# For a note
curl -X POST http://localhost:8080/api/files/upload \
  -F "file=@/path/to/document.pdf" \
  -F "noteId=1"

# For a subnote
curl -X POST http://localhost:8080/api/files/upload \
  -F "file=@/path/to/image.png" \
  -F "subNoteId=1"
```

### Download a file
```bash
curl -O -J http://localhost:8080/api/files/1/download
```

### Get file info
```bash
curl http://localhost:8080/api/files/1
```

### Get files by note ID
```bash
curl http://localhost:8080/api/files/note/1
```

### Get files by subnote ID
```bash
curl http://localhost:8080/api/files/subnote/1
```

### Delete a file
```bash
curl -X DELETE http://localhost:8080/api/files/1
```

## Common Response Codes

- `200 OK` - Success
- `201 Created` - Resource created
- `204 No Content` - Success with no response body
- `400 Bad Request` - Invalid request data
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

## Testing with Postman

Import these examples into Postman by:
1. Create a new collection
2. Set base URL variable: `{{baseUrl}} = http://localhost:8080`
3. Add requests using the examples above

## Testing with Browser

For GET requests, you can use your browser:
- All notes: http://localhost:8080/api/notes
- All buckets: http://localhost:8080/api/buckets
- All tags: http://localhost:8080/api/tags
- Hot topics: http://localhost:8080/api/notes/hot-topics
- Stats: http://localhost:8080/api/notes/stats
