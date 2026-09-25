package com.example.noteapp.controller;

import com.example.noteapp.dto.BucketViewDTO;
import com.example.noteapp.dto.NoteDTO;
import com.example.noteapp.dto.SubNoteDTO;
import com.example.noteapp.model.Bucket;
import com.example.noteapp.model.Note;
import com.example.noteapp.model.SubNote;
import com.example.noteapp.model.Tag;
import com.example.noteapp.model.TeamMember;
import com.example.noteapp.repository.NoteRepository;
import com.example.noteapp.repository.SubNoteRepository;
import com.example.noteapp.service.BucketService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/buckets")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class BucketController {

    private final BucketService bucketService;
    private final NoteRepository noteRepository;
    private final SubNoteRepository subNoteRepository;

    @GetMapping
    public ResponseEntity<List<Bucket>> getAllBuckets() {
        return ResponseEntity.ok(bucketService.getAllBuckets());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Bucket> getBucketById(@PathVariable Long id) {
        return bucketService.getBucketById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Bucket> createBucket(@RequestBody Bucket bucket) {
        return ResponseEntity.ok(bucketService.createBucket(bucket));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Bucket> updateBucket(@PathVariable Long id, @RequestBody Bucket bucket) {
        return ResponseEntity.ok(bucketService.updateBucket(id, bucket));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBucket(@PathVariable Long id) {
        bucketService.deleteBucket(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/view")
    public ResponseEntity<List<BucketViewDTO>> getBucketView() {
        List<Bucket> buckets = bucketService.getAllBuckets();
        List<BucketViewDTO> bucketViews = new ArrayList<>();

        for (Bucket bucket : buckets) {
            List<Note> notes = noteRepository.findByBucketId(bucket.getId());
            List<SubNote> subNotes = subNoteRepository.findAllByBucketId(bucket.getId());

            List<NoteDTO> noteDTOs = notes.stream()
                    .map(this::convertNoteToDTO)
                    .collect(Collectors.toList());

            List<SubNoteDTO> subNoteDTOs = subNotes.stream()
                    .map(this::convertSubNoteToDTO)
                    .collect(Collectors.toList());

            BucketViewDTO bucketView = BucketViewDTO.builder()
                    .bucketId(bucket.getId())
                    .bucketName(bucket.getName())
                    .bucketColor(bucket.getColor())
                    .bucketPriority(bucket.getPriority())
                    .notes(noteDTOs)
                    .subNotes(subNoteDTOs)
                    .build();

            bucketViews.add(bucketView);
        }

        return ResponseEntity.ok(bucketViews);
    }

    private NoteDTO convertNoteToDTO(Note note) {
        return NoteDTO.builder()
                .id(note.getId())
                .name(note.getName())
                .details(note.getDetails())
                .createdAt(note.getCreatedAt())
                .updatedAt(note.getUpdatedAt())
                .lastTrackedDate(note.getLastTrackedDate())
                .favorite(note.getFavorite())
                .hotTopic(note.getHotTopic())
                .deleted(note.getDeleted())
                .deletedAt(note.getDeletedAt())
                .nested(note.getNested())
                .bucketId(note.getBucketId())
                .tagIds(note.getTags().stream().map(Tag::getId).collect(Collectors.toSet()))
                .teamMemberIds(note.getTeamMembers().stream().map(TeamMember::getId).collect(Collectors.toSet()))
                .build();
    }

    private SubNoteDTO convertSubNoteToDTO(SubNote subNote) {
        return SubNoteDTO.builder()
                .id(subNote.getId())
                .header(subNote.getHeader())
                .description(subNote.getDescription())
                .linkedNoteId(subNote.getLinkedNoteId())
                .bucketId(subNote.getBucketId())
                .displayOrder(subNote.getDisplayOrder())
                .hotTopic(subNote.getHotTopic())
                .createdAt(subNote.getCreatedAt())
                .updatedAt(subNote.getUpdatedAt())
                .lastTrackedDate(subNote.getLastTrackedDate())
                .noteId(subNote.getNotes() != null && !subNote.getNotes().isEmpty() ? subNote.getNotes().iterator().next().getId() : null)
                .tagIds(subNote.getTags().stream().map(Tag::getId).collect(Collectors.toSet()))
                .teamMemberIds(subNote.getTeamMembers().stream().map(TeamMember::getId).collect(Collectors.toSet()))
                .build();
    }
}
