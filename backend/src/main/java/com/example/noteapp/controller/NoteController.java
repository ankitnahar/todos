package com.example.noteapp.controller;

import com.example.noteapp.dto.*;
import com.example.noteapp.service.NoteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/notes")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class NoteController {

    private final NoteService noteService;

    @GetMapping
    public ResponseEntity<List<NoteDTO>> getAllNotes(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Set<Long> tagIds,
            @RequestParam(required = false) Set<Long> bucketIds,
            @RequestParam(required = false) Set<Long> teamMemberIds,
            @RequestParam(required = false) String trackStatus,
            @RequestParam(required = false) String tagMatchMode) {
        List<NoteDTO> notes = noteService.getAllNotes(search, tagIds, bucketIds, teamMemberIds, trackStatus, tagMatchMode);
        return ResponseEntity.ok(notes);
    }

    @GetMapping("/{id}")
    public ResponseEntity<NoteDTO> getNoteById(@PathVariable Long id) {
        return ResponseEntity.ok(noteService.getNoteById(id));
    }

    @PostMapping
    public ResponseEntity<NoteDTO> createNote(@Valid @RequestBody NoteCreateRequest request) {
        return ResponseEntity.ok(noteService.createNote(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<NoteDTO> updateNote(@PathVariable Long id, @RequestBody NoteUpdateRequest request) {
        return ResponseEntity.ok(noteService.updateNote(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNote(@PathVariable Long id) {
        noteService.softDeleteNote(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/toggle-favorite")
    public ResponseEntity<NoteDTO> toggleFavorite(@PathVariable Long id) {
        return ResponseEntity.ok(noteService.toggleFavorite(id));
    }

    @PostMapping("/{id}/toggle-hot-topic")
    public ResponseEntity<NoteDTO> toggleHotTopic(@PathVariable Long id) {
        return ResponseEntity.ok(noteService.toggleHotTopic(id));
    }

    @PostMapping("/{id}/track-today")
    public ResponseEntity<NoteDTO> trackToday(@PathVariable Long id) {
        return ResponseEntity.ok(noteService.trackToday(id));
    }

    @PostMapping("/{id}/untrack-today")
    public ResponseEntity<NoteDTO> untrackToday(@PathVariable Long id) {
        return ResponseEntity.ok(noteService.untrackToday(id));
    }

    @PostMapping("/{id}/move-bucket")
    public ResponseEntity<NoteDTO> moveToBucket(@PathVariable Long id, @RequestBody Map<String, Long> request) {
        Long bucketId = request.get("bucketId");
        return ResponseEntity.ok(noteService.moveToBucket(id, bucketId));
    }

    @PostMapping("/{id}/duplicate")
    public ResponseEntity<NoteDTO> duplicateNote(@PathVariable Long id) {
        return ResponseEntity.ok(noteService.duplicateNote(id));
    }

    @GetMapping("/deleted")
    public ResponseEntity<List<NoteDTO>> getDeletedNotes() {
        return ResponseEntity.ok(noteService.getDeletedNotes());
    }

    @PostMapping("/{id}/restore")
    public ResponseEntity<NoteDTO> restoreNote(@PathVariable Long id) {
        return ResponseEntity.ok(noteService.restoreNote(id));
    }

    @DeleteMapping("/{id}/hard-delete")
    public ResponseEntity<Void> hardDeleteNote(@PathVariable Long id) {
        noteService.hardDeleteNote(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/subnotes")
    public ResponseEntity<SubNoteDTO> createSubNote(@PathVariable Long id, @Valid @RequestBody SubNoteCreateRequest request) {
        return ResponseEntity.ok(noteService.createSubNote(id, request));
    }

    @PutMapping("/subnotes/{subNoteId}")
    public ResponseEntity<SubNoteDTO> updateSubNote(@PathVariable Long subNoteId, @RequestBody SubNoteUpdateRequest request) {
        return ResponseEntity.ok(noteService.updateSubNote(subNoteId, request));
    }

    @DeleteMapping("/subnotes/{subNoteId}")
    public ResponseEntity<Void> deleteSubNote(@PathVariable Long subNoteId) {
        noteService.deleteSubNote(subNoteId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/subnotes/{subNoteId}/toggle-hot-topic")
    public ResponseEntity<SubNoteDTO> toggleSubNoteHotTopic(@PathVariable Long subNoteId) {
        return ResponseEntity.ok(noteService.toggleSubNoteHotTopic(subNoteId));
    }

    @PostMapping("/subnotes/{subNoteId}/track-today")
    public ResponseEntity<SubNoteDTO> trackSubNoteToday(@PathVariable Long subNoteId) {
        return ResponseEntity.ok(noteService.trackSubNoteToday(subNoteId));
    }

    @PostMapping("/subnotes/{subNoteId}/untrack-today")
    public ResponseEntity<SubNoteDTO> untrackSubNoteToday(@PathVariable Long subNoteId) {
        return ResponseEntity.ok(noteService.untrackSubNoteToday(subNoteId));
    }

    @PostMapping("/subnotes/{subNoteId}/move-bucket")
    public ResponseEntity<SubNoteDTO> moveSubNoteToBucket(@PathVariable Long subNoteId, @RequestBody Map<String, Long> request) {
        Long bucketId = request.get("bucketId");
        return ResponseEntity.ok(noteService.moveSubNoteToBucket(subNoteId, bucketId));
    }

    @PostMapping("/subnotes/{subNoteId}/move-note")
    public ResponseEntity<SubNoteDTO> moveSubNoteToNote(@PathVariable Long subNoteId, @RequestBody Map<String, Long> request) {
        Long newNoteId = request.get("noteId");
        return ResponseEntity.ok(noteService.moveSubNoteToNote(subNoteId, newNoteId));
    }

    @PostMapping("/subnotes/{subNoteId}/convert-to-note")
    public ResponseEntity<NoteDTO> convertSubNoteToNote(@PathVariable Long subNoteId) {
        return ResponseEntity.ok(noteService.convertSubNoteToNote(subNoteId));
    }

    @PostMapping("/subnotes/{subNoteId}/link-to-note")
    public ResponseEntity<SubNoteDTO> linkSubNoteToNote(@PathVariable Long subNoteId, @RequestBody Map<String, Long> request) {
        Long noteId = request.get("noteId");
        return ResponseEntity.ok(noteService.linkSubNoteToNote(subNoteId, noteId));
    }

    @PostMapping("/subnotes/{subNoteId}/unlink-from-note")
    public ResponseEntity<Void> unlinkSubNoteFromNote(@PathVariable Long subNoteId, @RequestBody Map<String, Long> request) {
        Long noteId = request.get("noteId");
        noteService.unlinkSubNoteFromNote(subNoteId, noteId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/hot-topics")
    public ResponseEntity<List<HotTopicItemDTO>> getHotTopics() {
        return ResponseEntity.ok(noteService.getHotTopics());
    }

    @GetMapping("/stats")
    public ResponseEntity<StatsDTO> getStats() {
        return ResponseEntity.ok(noteService.getStats());
    }
}
