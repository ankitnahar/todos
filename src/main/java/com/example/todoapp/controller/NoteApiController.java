package com.example.todoapp.controller;

import com.example.todoapp.model.Note;
import com.example.todoapp.model.SubNote;
import com.example.todoapp.model.Tag;
import com.example.todoapp.model.TeamMember;
import com.example.todoapp.dto.NoteDTO;
import com.example.todoapp.dto.SubNoteDTO;
import com.example.todoapp.service.NoteService;
import com.example.todoapp.service.TagService;
import com.example.todoapp.service.TeamMemberService;
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
    
    @Autowired
    private TagService tagService;
    
    @Autowired
    private TeamMemberService teamMemberService;

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

        // Convert team members
        if (note.getTeamMembers() != null) {
            note.getTeamMembers().forEach(tm -> {
                dto.getTeamMembers().add(new com.example.todoapp.dto.TeamMemberDTO(tm.getId(), tm.getName()));
            });
        }

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
                
                // Convert sub-note team members
                if (subNote.getTeamMembers() != null) {
                    subNote.getTeamMembers().forEach(tm -> {
                        subNoteDTO.getTeamMembers().add(new com.example.todoapp.dto.TeamMemberDTO(tm.getId(), tm.getName()));
                    });
                }
                
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

    @PostMapping("/subnote/{id}/save")
    public ResponseEntity<?> saveSubNote(@PathVariable Long id,
                                         @RequestParam String header,
                                         @RequestParam(required = false) String description,
                                         @RequestParam Long bucketId,
                                         @RequestParam(required = false) String tagIds,
                                         @RequestParam(required = false) String teamMemberIds) {
        try {
            SubNote subNote = noteService.findSubNoteById(id);
            if (subNote == null) {
                return ResponseEntity.notFound().build();
            }

            // Validate required fields
            if (header == null || header.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(new Object() {
                    public boolean success = false;
                    public String message = "Header is required";
                });
            }

            // Update subnote properties
            subNote.setHeader(header);
            subNote.setDescription(description != null ? description : "");
            subNote.setBucketId(bucketId);

            // Handle tags
            if (tagIds != null && !tagIds.trim().isEmpty()) {
                String[] tagIdArray = tagIds.split("\\|");
                java.util.Set<Tag> tags = new java.util.HashSet<>();
                for (String tagIdStr : tagIdArray) {
                    try {
                        Long tagId = Long.parseLong(tagIdStr.trim());
                        tagService.findById(tagId).ifPresent(tags::add);
                    } catch (NumberFormatException e) {
                        // Skip invalid tag IDs
                    }
                }
                subNote.setTags(tags);
            } else {
                subNote.setTags(new java.util.HashSet<>());
            }

            // Handle team members
            if (teamMemberIds != null && !teamMemberIds.trim().isEmpty()) {
                String[] tmIdArray = teamMemberIds.split("\\|");
                java.util.Set<TeamMember> teamMembers = new java.util.HashSet<>();
                for (String tmIdStr : tmIdArray) {
                    try {
                        Long tmId = Long.parseLong(tmIdStr.trim());
                        teamMemberService.findById(tmId).ifPresent(teamMembers::add);
                    } catch (NumberFormatException e) {
                        // Skip invalid team member IDs
                    }
                }
                subNote.setTeamMembers(teamMembers);
            } else {
                subNote.setTeamMembers(new java.util.HashSet<>());
            }

            // Save the subnote
            noteService.saveSubNote(subNote);

            return ResponseEntity.ok().body(new Object() {
                public boolean success = true;
                public String message = "Sub-note saved successfully";
            });
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new Object() {
                        public boolean success = false;
                        public String message = "Error: " + e.getMessage();
                    });
        }
    }

    @PostMapping("/{noteId}/subnote/create")
    public ResponseEntity<?> createSubNote(@PathVariable Long noteId,
                                          @RequestParam String header,
                                          @RequestParam(required = false) String description,
                                          @RequestParam Long bucketId,
                                          @RequestParam(required = false) String tagIds,
                                          @RequestParam(required = false) String teamMemberIds) {
        try {
            // Validate required fields
            if (header == null || header.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(new Object() {
                    public boolean success = false;
                    public String message = "Header is required";
                });
            }

            // Fetch the parent note
            Note parentNote = noteService.findById(noteId).orElse(null);
            if (parentNote == null) {
                return ResponseEntity.notFound().build();
            }

            // Create new subnote
            SubNote subNote = new SubNote();
            subNote.setHeader(header);
            subNote.setDescription(description != null ? description : "");
            subNote.setBucketId(bucketId);
            subNote.setNote(parentNote);

            // Handle tags
            if (tagIds != null && !tagIds.trim().isEmpty()) {
                String[] tagIdArray = tagIds.split("\\|");
                java.util.Set<Tag> tags = new java.util.HashSet<>();
                for (String tagIdStr : tagIdArray) {
                    try {
                        Long tagId = Long.parseLong(tagIdStr.trim());
                        tagService.findById(tagId).ifPresent(tags::add);
                    } catch (NumberFormatException e) {
                        // Skip invalid tag IDs
                    }
                }
                subNote.setTags(tags);
            } else {
                subNote.setTags(new java.util.HashSet<>());
            }

            // Handle team members
            if (teamMemberIds != null && !teamMemberIds.trim().isEmpty()) {
                String[] tmIdArray = teamMemberIds.split("\\|");
                java.util.Set<TeamMember> teamMembers = new java.util.HashSet<>();
                for (String tmIdStr : tmIdArray) {
                    try {
                        Long tmId = Long.parseLong(tmIdStr.trim());
                        teamMemberService.findById(tmId).ifPresent(teamMembers::add);
                    } catch (NumberFormatException e) {
                        // Skip invalid team member IDs
                    }
                }
                subNote.setTeamMembers(teamMembers);
            } else {
                subNote.setTeamMembers(new java.util.HashSet<>());
            }

            // Save the new subnote
            SubNote savedSubNote = noteService.saveSubNote(subNote);

            return ResponseEntity.ok().body(new Object() {
                public boolean success = true;
                public String message = "Sub-note created successfully";
                public Long subNoteId = savedSubNote.getId();
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
