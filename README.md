# Notes App - Modern Rebuild

A modern, user-friendly notes management application built with **Spring Boot** (backend) and **React TypeScript** (frontend). Migrated from a legacy Thymeleaf app with all existing data preserved.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (React)                   │
│            http://localhost:3000                      │
│  ┌─────────┐ ┌──────────┐ ┌────────┐ ┌──────────┐  │
│  │Dashboard│ │Notes List│ │ Bucket │ │Hot Topics│  │
│  │ Charts  │ │  Table   │ │ Board  │ │Dashboard │  │
│  └─────────┘ └──────────┘ └────────┘ └──────────┘  │
│  Rich Text Editor │ File Upload │ Dark Mode          │
└────────────────────────┬────────────────────────────┘
                         │ REST API (JSON)
┌────────────────────────┴────────────────────────────┐
│                 Backend (Spring Boot)                 │
│              http://localhost:8080                    │
│  ┌──────────┐ ┌────────┐ ┌──────┐ ┌────────────┐   │
│  │  Notes   │ │Buckets │ │ Tags │ │Team Members│   │
│  │Controller│ │  API   │ │ API  │ │    API     │   │
│  └──────────┘ └────────┘ └──────┘ └────────────┘   │
│  ┌──────────────────────────────────────────────┐   │
│  │              H2 Database (File)               │   │
│  │            ./backend/data/todo.mv.db          │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

## Features

### Core Features
- **Notes Management** - Create, edit, delete, duplicate, soft-delete/restore
- **Sub-Notes** - Nested notes with independent tags, team members, and bucket assignments
- **Tags** - Categorize notes and subnotes with tags (AND/OR filter modes)
- **Buckets** - Priority lanes with colors (like Kanban columns)
- **Team Members** - Assign people to notes and subnotes
- **Hot Topics** - Flag important items for quick access
- **File Attachments** - Upload files to notes/subnotes

### Views
- **Dashboard** - Charts showing notes per bucket, activity timeline, tag cloud
- **Notes List** - Advanced data table with sorting, filtering, search
- **Bucket View** - Kanban board with drag-and-drop
- **Priority View** - Notes sorted by bucket priority
- **Hot Topics** - All flagged items grouped by bucket/note

### UX Features
- Dark/Light mode
- Rich text editor (bold, italic, headings, lists, links, images, code)
- Instant global search with debounce
- Keyboard shortcuts
- Drag-and-drop (bucket board, file upload)
- Responsive design (mobile-friendly)
- Toast notifications
- Skeleton loading states
- Inline editing for subnotes

## Prerequisites

- **Java 17+** (for Spring Boot backend)
- **Node.js 18+** (for React frontend)
- **Maven** (included via Maven Wrapper)

## Quick Start

```bash
# Start both services
./start.sh

# Stop both services
./stop.sh

# Restart
./restart.sh
```

### Manual Start

**Backend:**
```bash
cd backend
./mvnw spring-boot:run
# Runs on http://localhost:8080
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:3000
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/notes | List notes (with filters) |
| POST | /api/notes | Create note |
| GET | /api/notes/{id} | Get note with subnotes |
| PUT | /api/notes/{id} | Update note |
| DELETE | /api/notes/{id} | Soft delete note |
| POST | /api/notes/{id}/toggle-favorite | Toggle favorite |
| POST | /api/notes/{id}/toggle-hot-topic | Toggle hot topic |
| POST | /api/notes/{id}/track-today | Mark tracked |
| POST | /api/notes/{id}/duplicate | Duplicate note |
| GET | /api/notes/hot-topics | Get hot topic items |
| GET | /api/notes/stats | Get statistics |
| GET | /api/buckets | List buckets |
| GET | /api/buckets/view | Bucket board data |
| GET | /api/tags | List tags |
| GET | /api/team-members | List team members |
| POST | /api/files/upload | Upload file |

## Database

Using H2 file-based database (zero configuration needed). Data persists in `backend/data/todo.mv.db`.

**H2 Console:** http://localhost:8080/h2-console
- JDBC URL: `jdbc:h2:file:./data/todo`
- Username: `sa`
- Password: (empty)

## Tech Stack

### Backend
- Spring Boot 3.3.x
- Spring Data JPA
- H2 Database
- Lombok
- Bean Validation

### Frontend
- React 18 + TypeScript
- Vite (build tool)
- TanStack Table (data tables)
- TanStack Query (data fetching)
- Tiptap (rich text editor)
- Recharts (charts)
- Tailwind CSS (styling)
- Lucide React (icons)
- React Router v6
- Axios (HTTP client)
- react-hot-toast (notifications)

## Project Structure

```
todo-app/
├── start.sh            # Start both services
├── stop.sh             # Stop both services
├── restart.sh          # Restart both services
├── README.md           # This file
├── backend/
│   ├── pom.xml
│   ├── mvnw, mvnw.cmd
│   ├── data/
│   │   ├── todo.mv.db     # H2 database (your data!)
│   │   └── uploads/       # Uploaded files
│   └── src/main/java/com/example/noteapp/
│       ├── NoteApplication.java
│       ├── model/          # JPA entities
│       ├── repository/     # Data access
│       ├── service/        # Business logic
│       ├── controller/     # REST endpoints
│       ├── dto/            # Data transfer objects
│       └── config/         # CORS, etc.
└── frontend/
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── src/
    │   ├── api/            # API client layer
    │   ├── types/          # TypeScript interfaces
    │   ├── components/     # Reusable UI components
    │   ├── pages/          # Route pages
    │   ├── hooks/          # Custom React hooks
    │   └── context/        # React contexts (theme)
    └── public/
```
