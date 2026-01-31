package com.example.todoapp.controller;

import com.example.todoapp.model.Note;
import com.example.todoapp.model.SubNote;
import com.example.todoapp.dto.NoteDTO;
import com.example.todoapp.dto.SubNoteDTO;
import com.example.todoapp.service.NoteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Optional;

@RestController
@RequestMapping("/api/notes")
public class NoteApiController {

    @Autowired
    private NoteService noteService;

    @GetMapping("/{id}")
    public ResponseEntity<?> getNoteAsJson(@PathVariable Long id) {
        try {
            Note note = noteService.findByIdWithSubNotes(id);
            if (note != null) {
                // Convert to DTO to avoid circular reference serialization
                NoteDTO noteDTO = convertToDTO(note);
                return ResponseEntity.ok(noteDTO);
            }
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error fetching note: " + e.getMessage());
        }
    }

    private NoteDTO convertToDTO(Note note) {
        NoteDTO dto = new NoteDTO(
                note.getId(),
                note.getName(),
                note.getDetails(),
                note.getNested(),
                note.getCreatedAt(),
                note.getUpdatedAt(),
                note.isFavorite(),
                note.getDeleted()
        );

        // Convert sub-notes
        if (note.getSubNotes() != null) {
            for (SubNote subNote : note.getSubNotes()) {
                SubNoteDTO subNoteDTO = new SubNoteDTO(
                        subNote.getId(),
                        subNote.getHeader(),
                        subNote.getDescription(),
                        subNote.getBucketId(),
                        subNote.getDisplayOrder(),
                        subNote.getCreatedAt(),
                        subNote.getUpdatedAt()
                );
                dto.addSubNote(subNoteDTO);
            }
        }

        return dto;
    }

    @PostMapping("/{id}/track-today")
    public ResponseEntity<?> trackNoteForToday(@PathVariable Long id) {
        try {
            Optional<Note> noteOpt = noteService.findById(id);
            if (noteOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            
            Note note = noteOpt.get();
            // Set lastTrackedDate to today
            LocalDateTime todayStart = LocalDateTime.of(LocalDate.now(), LocalTime.MIDNIGHT);
            note.setLastTrackedDate(todayStart);
            noteService.save(note);
            
            return ResponseEntity.ok().body(new Object() {
                public boolean success = true;
                public String message = "Note tracked for today";
            });
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new Object() {
                        public boolean success = false;
                        public String message = "Error: " + e.getMessage();
                    });
        }
    }

    @PostMapping("/{id}/untrack-today")
    public ResponseEntity<?> untrackNoteForToday(@PathVariable Long id) {
        try {
            Optional<Note> noteOpt = noteService.findById(id);
            if (noteOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            
            Note note = noteOpt.get();
            // Clear lastTrackedDate
            note.setLastTrackedDate(null);
            noteService.save(note);
            
            return ResponseEntity.ok().body(new Object() {
                public boolean success = true;
                public String message = "Note untracked";
            });
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new Object() {
                        public boolean success = false;
                        public String message = "Error: " + e.getMessage();
                    });
        }
    }

    @PostMapping("/subnote/{id}/track-today")
    public ResponseEntity<?> trackSubNoteForToday(@PathVariable Long id) {
        try {
            SubNote subNote = noteService.findSubNoteById(id);
            if (subNote == null) {
                return ResponseEntity.notFound().build();
            }
            
            // Set lastTrackedDate to today
            LocalDateTime todayStart = LocalDateTime.of(LocalDate.now(), LocalTime.MIDNIGHT);
            subNote.setLastTrackedDate(todayStart);
            noteService.saveSubNote(subNote);
            
            return ResponseEntity.ok().body(new Object() {
                public boolean success = true;
                public String message = "Sub-note tracked for today";
            });
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new Object() {
                        public boolean success = false;
                        public String message = "Error: " + e.getMessage();
                    });
        }
    }

    @PostMapping("/subnote/{id}/untrack-today")
    public ResponseEntity<?> untrackSubNoteForToday(@PathVariable Long id) {
        try {
            SubNote subNote = noteService.findSubNoteById(id);
            if (subNote == null) {
                return ResponseEntity.notFound().build();
            }
            
            // Clear lastTrackedDate
            subNote.setLastTrackedDate(null);
            noteService.saveSubNote(subNote);
            
            return ResponseEntity.ok().body(new Object() {
                public boolean success = true;
                public String message = "Sub-note untracked";
            });
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new Object() {
                        public boolean success = false;
                        public String message = "Error: " + e.getMessage();
                    });
        }
    }
}
