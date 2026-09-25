package com.example.noteapp.service;

import com.example.noteapp.dto.*;
import com.example.noteapp.model.Note;
import com.example.noteapp.model.SubNote;
import com.example.noteapp.model.Tag;
import com.example.noteapp.model.TeamMember;
import com.example.noteapp.repository.NoteRepository;
import com.example.noteapp.repository.SubNoteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NoteService {

    private final NoteRepository noteRepository;
    private final SubNoteRepository subNoteRepository;
    private final TagService tagService;
    private final TeamMemberService teamMemberService;

    @Transactional(readOnly = true)
    public List<NoteDTO> getAllNotes(String search, Set<Long> tagIds, Set<Long> bucketIds,
                                     Set<Long> teamMemberIds, String trackStatus, String tagMatchMode) {
        List<Note> notes;

        if (search != null && !search.isBlank()) {
            notes = noteRepository.searchNotes(search);
        } else {
            notes = noteRepository.findAllSorted();
        }

        // Eagerly initialize subnotes and their collections to support tag inheritance
        for (Note note : notes) {
            if (note.getSubNotes() != null) {
                note.getSubNotes().size();
                for (SubNote sn : note.getSubNotes()) {
                    sn.getTags().size();
                    sn.getTeamMembers().size();
                }
            }
        }

        notes = filterNotes(notes, tagIds, bucketIds, teamMemberIds, trackStatus, tagMatchMode);

        return notes.stream()
                .map(this::convertToDTOWithSubNotes)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public NoteDTO getNoteById(Long id) {
        Note note = noteRepository.findByIdWithSubNotes(id)
                .orElseThrow(() -> new RuntimeException("Note not found with id: " + id));
        // Eagerly load subnote collections to avoid N+1 and Cartesian product
        if (note.getSubNotes() != null) {
            for (SubNote subNote : note.getSubNotes()) {
                subNote.getTags().size();
                subNote.getTeamMembers().size();
            }
        }
        return convertToDTOWithSubNotes(note);
    }

    @Transactional
    public NoteDTO createNote(NoteCreateRequest request) {
        Set<Tag> tags = tagService.findOrCreateTags(request.getTagNames());
        Set<TeamMember> teamMembers = new HashSet<>();
        if (request.getTeamMemberIds() != null) {
            teamMembers = new HashSet<>(teamMemberService.findAllByIds(new ArrayList<>(request.getTeamMemberIds())));
        }

        Note note = Note.builder()
                .name(request.getName())
                .details(request.getDetails())
                .favorite(request.getFavorite() != null ? request.getFavorite() : false)
                .hotTopic(request.getHotTopic() != null ? request.getHotTopic() : false)
                .nested(request.getNested() != null ? request.getNested() : false)
                .bucketId(request.getBucketId())
                .tags(tags)
                .teamMembers(teamMembers)
                .deleted(false)
                .build();

        note = noteRepository.save(note);

        if (request.getSubNotes() != null) {
            for (SubNoteCreateRequest subNoteRequest : request.getSubNotes()) {
                createSubNoteForNote(note, subNoteRequest);
            }
        }

        return convertToDTOWithSubNotes(noteRepository.findByIdWithSubNotes(note.getId()).orElseThrow());
    }

    @Transactional
    public NoteDTO updateNote(Long id, NoteUpdateRequest request) {
        Note note = noteRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Note not found with id: " + id));

        if (request.getName() != null) {
            note.setName(request.getName());
        }
        if (request.getDetails() != null) {
            note.setDetails(request.getDetails());
        }
        if (request.getFavorite() != null) {
            note.setFavorite(request.getFavorite());
        }
        if (request.getHotTopic() != null) {
            note.setHotTopic(request.getHotTopic());
        }
        if (request.getNested() != null) {
            note.setNested(request.getNested());
        }
        if (request.getBucketId() != null) {
            note.setBucketId(request.getBucketId());
        }
        if (request.getTagNames() != null) {
            note.setTags(tagService.findOrCreateTags(request.getTagNames()));
        }
        if (request.getTeamMemberIds() != null) {
            note.setTeamMembers(new HashSet<>(teamMemberService.findAllByIds(new ArrayList<>(request.getTeamMemberIds()))));
        }

        note = noteRepository.save(note);
        return convertToDTO(note);
    }

    @Transactional
    public void softDeleteNote(Long id) {
        Note note = noteRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Note not found with id: " + id));
        note.setDeleted(true);
        note.setDeletedAt(LocalDateTime.now());
        noteRepository.save(note);
    }

    @Transactional
    public void hardDeleteNote(Long id) {
        noteRepository.deleteById(id);
    }

    @Transactional
    public NoteDTO toggleFavorite(Long id) {
        Note note = noteRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Note not found with id: " + id));
        note.setFavorite(!note.getFavorite());
        note = noteRepository.save(note);
        return convertToDTO(note);
    }

    @Transactional
    public NoteDTO toggleHotTopic(Long id) {
        Note note = noteRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Note not found with id: " + id));
        note.setHotTopic(!note.getHotTopic());
        note = noteRepository.save(note);
        return convertToDTO(note);
    }

    @Transactional
    public NoteDTO trackToday(Long id) {
        Note note = noteRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Note not found with id: " + id));
        note.setLastTrackedDate(LocalDateTime.now());
        note = noteRepository.save(note);
        return convertToDTO(note);
    }

    @Transactional
    public NoteDTO untrackToday(Long id) {
        Note note = noteRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Note not found with id: " + id));
        note.setLastTrackedDate(null);
        note = noteRepository.save(note);
        return convertToDTO(note);
    }

    @Transactional
    public NoteDTO moveToBucket(Long id, Long bucketId) {
        Note note = noteRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Note not found with id: " + id));
        note.setBucketId(bucketId);
        note = noteRepository.save(note);
        return convertToDTO(note);
    }

    @Transactional
    public NoteDTO duplicateNote(Long id) {
        Note original = noteRepository.findByIdWithSubNotes(id)
                .orElseThrow(() -> new RuntimeException("Note not found with id: " + id));

        Note duplicate = Note.builder()
                .name(original.getName() + " (Copy)")
                .details(original.getDetails())
                .favorite(false)
                .hotTopic(false)
                .nested(original.getNested())
                .bucketId(original.getBucketId())
                .tags(new HashSet<>(original.getTags()))
                .teamMembers(new HashSet<>(original.getTeamMembers()))
                .deleted(false)
                .build();

        duplicate = noteRepository.save(duplicate);

        for (SubNote originalSubNote : original.getSubNotes()) {
            SubNote duplicateSubNote = SubNote.builder()
                    .header(originalSubNote.getHeader())
                    .description(originalSubNote.getDescription())
                    .linkedNoteId(originalSubNote.getLinkedNoteId())
                    .bucketId(originalSubNote.getBucketId())
                    .displayOrder(originalSubNote.getDisplayOrder())
                    .hotTopic(false)
                    .tags(new HashSet<>(originalSubNote.getTags()))
                    .teamMembers(new HashSet<>(originalSubNote.getTeamMembers()))
                    .build();
            duplicateSubNote = subNoteRepository.save(duplicateSubNote);
            duplicate.getSubNotes().add(duplicateSubNote);
        }
        noteRepository.save(duplicate);

        return convertToDTOWithSubNotes(noteRepository.findByIdWithSubNotes(duplicate.getId()).orElseThrow());
    }

    @Transactional(readOnly = true)
    public List<NoteDTO> getDeletedNotes() {
        List<Note> notes = noteRepository.findAllDeleted();
        return notes.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public NoteDTO restoreNote(Long id) {
        Note note = noteRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Note not found with id: " + id));
        note.setDeleted(false);
        note.setDeletedAt(null);
        note = noteRepository.save(note);
        return convertToDTO(note);
    }

    @Transactional
    public SubNoteDTO createSubNote(Long noteId, SubNoteCreateRequest request) {
        Note note = noteRepository.findById(noteId)
                .orElseThrow(() -> new RuntimeException("Note not found with id: " + noteId));
        return createSubNoteForNote(note, request);
    }

    @Transactional
    public SubNoteDTO updateSubNote(Long subNoteId, SubNoteUpdateRequest request) {
        SubNote subNote = subNoteRepository.findById(subNoteId)
                .orElseThrow(() -> new RuntimeException("SubNote not found with id: " + subNoteId));

        if (request.getHeader() != null) {
            subNote.setHeader(request.getHeader());
        }
        if (request.getDescription() != null) {
            subNote.setDescription(request.getDescription());
        }
        if (request.getLinkedNoteId() != null) {
            subNote.setLinkedNoteId(request.getLinkedNoteId());
        }
        if (request.getBucketId() != null) {
            subNote.setBucketId(request.getBucketId());
        }
        if (request.getDisplayOrder() != null) {
            subNote.setDisplayOrder(request.getDisplayOrder());
        }
        if (request.getHotTopic() != null) {
            subNote.setHotTopic(request.getHotTopic());
        }
        if (request.getTagNames() != null) {
            subNote.setTags(tagService.findOrCreateTags(request.getTagNames()));
        }
        if (request.getTeamMemberIds() != null) {
            subNote.setTeamMembers(new HashSet<>(teamMemberService.findAllByIds(new ArrayList<>(request.getTeamMemberIds()))));
        }

        subNote = subNoteRepository.save(subNote);
        return convertSubNoteToDTO(subNote);
    }

    @Transactional
    public void deleteSubNote(Long subNoteId) {
        SubNote subNote = subNoteRepository.findById(subNoteId)
                .orElseThrow(() -> new RuntimeException("SubNote not found with id: " + subNoteId));
        // Remove from all parent notes first (ManyToMany owning side is Note)
        for (Note parent : new HashSet<>(subNote.getNotes())) {
            parent.getSubNotes().remove(subNote);
            noteRepository.save(parent);
        }
        subNoteRepository.delete(subNote);
    }

    @Transactional
    public SubNoteDTO toggleSubNoteHotTopic(Long subNoteId) {
        SubNote subNote = subNoteRepository.findById(subNoteId)
                .orElseThrow(() -> new RuntimeException("SubNote not found with id: " + subNoteId));
        subNote.setHotTopic(!subNote.getHotTopic());
        subNote = subNoteRepository.save(subNote);
        return convertSubNoteToDTO(subNote);
    }

    @Transactional
    public SubNoteDTO trackSubNoteToday(Long subNoteId) {
        SubNote subNote = subNoteRepository.findById(subNoteId)
                .orElseThrow(() -> new RuntimeException("SubNote not found with id: " + subNoteId));
        subNote.setLastTrackedDate(LocalDateTime.now());
        subNote = subNoteRepository.save(subNote);
        return convertSubNoteToDTO(subNote);
    }

    @Transactional
    public SubNoteDTO untrackSubNoteToday(Long subNoteId) {
        SubNote subNote = subNoteRepository.findById(subNoteId)
                .orElseThrow(() -> new RuntimeException("SubNote not found with id: " + subNoteId));
        subNote.setLastTrackedDate(null);
        subNote = subNoteRepository.save(subNote);
        return convertSubNoteToDTO(subNote);
    }

    @Transactional
    public SubNoteDTO moveSubNoteToBucket(Long subNoteId, Long bucketId) {
        SubNote subNote = subNoteRepository.findById(subNoteId)
                .orElseThrow(() -> new RuntimeException("SubNote not found with id: " + subNoteId));
        subNote.setBucketId(bucketId);
        subNote = subNoteRepository.save(subNote);
        return convertSubNoteToDTO(subNote);
    }

    @Transactional
    public SubNoteDTO moveSubNoteToNote(Long subNoteId, Long newNoteId) {
        SubNote subNote = subNoteRepository.findById(subNoteId)
                .orElseThrow(() -> new RuntimeException("SubNote not found with id: " + subNoteId));
        Note newNote = noteRepository.findById(newNoteId)
                .orElseThrow(() -> new RuntimeException("Note not found with id: " + newNoteId));
        // Remove from all current parents
        for (Note parent : subNote.getNotes()) {
            parent.getSubNotes().remove(subNote);
            noteRepository.save(parent);
        }
        // Add to new parent
        newNote.getSubNotes().add(subNote);
        noteRepository.save(newNote);
        return convertSubNoteToDTO(subNote);
    }

    @Transactional
    public SubNoteDTO linkSubNoteToNote(Long subNoteId, Long noteId) {
        SubNote subNote = subNoteRepository.findById(subNoteId)
                .orElseThrow(() -> new RuntimeException("SubNote not found with id: " + subNoteId));
        Note note = noteRepository.findById(noteId)
                .orElseThrow(() -> new RuntimeException("Note not found with id: " + noteId));
        if (!note.getSubNotes().contains(subNote)) {
            note.getSubNotes().add(subNote);
            noteRepository.save(note);
        }
        return convertSubNoteToDTO(subNote);
    }

    @Transactional
    public void unlinkSubNoteFromNote(Long subNoteId, Long noteId) {
        SubNote subNote = subNoteRepository.findById(subNoteId)
                .orElseThrow(() -> new RuntimeException("SubNote not found with id: " + subNoteId));
        Note note = noteRepository.findById(noteId)
                .orElseThrow(() -> new RuntimeException("Note not found with id: " + noteId));
        note.getSubNotes().remove(subNote);
        subNote.getNotes().remove(note);
        noteRepository.save(note);
        if (subNote.getNotes().isEmpty()) {
            subNoteRepository.delete(subNote);
        }
    }

    @Transactional
    public NoteDTO convertSubNoteToNote(Long subNoteId) {
        SubNote subNote = subNoteRepository.findById(subNoteId)
                .orElseThrow(() -> new RuntimeException("SubNote not found with id: " + subNoteId));

        Note newNote = Note.builder()
                .name(subNote.getHeader())
                .details(subNote.getDescription())
                .favorite(false)
                .hotTopic(subNote.getHotTopic())
                .nested(false)
                .bucketId(subNote.getBucketId())
                .tags(new HashSet<>(subNote.getTags()))
                .teamMembers(new HashSet<>(subNote.getTeamMembers()))
                .deleted(false)
                .build();

        newNote = noteRepository.save(newNote);
        // Remove subnote from all parents before deleting
        for (Note parent : new HashSet<>(subNote.getNotes())) {
            parent.getSubNotes().remove(subNote);
            noteRepository.save(parent);
        }
        subNoteRepository.delete(subNote);

        return convertToDTO(newNote);
    }

    @Transactional(readOnly = true)
    public List<HotTopicItemDTO> getHotTopics() {
        List<HotTopicItemDTO> hotTopics = new ArrayList<>();

        List<Note> hotNotes = noteRepository.findHotTopicNotes();
        for (Note note : hotNotes) {
            hotTopics.add(HotTopicItemDTO.builder()
                    .type("note")
                    .id(note.getId())
                    .title(note.getName())
                    .details(note.getDetails())
                    .noteId(note.getId())
                    .noteName(note.getName())
                    .bucketId(note.getBucketId())
                    .updatedAt(note.getUpdatedAt())
                    .tagIds(note.getTags().stream().map(Tag::getId).collect(Collectors.toSet()))
                    .teamMemberIds(note.getTeamMembers().stream().map(TeamMember::getId).collect(Collectors.toSet()))
                    .build());
        }

        List<SubNote> hotSubNotes = subNoteRepository.findHotTopicSubNotes();
        for (SubNote subNote : hotSubNotes) {
            Note firstParent = subNote.getNotes() != null && !subNote.getNotes().isEmpty() ? subNote.getNotes().iterator().next() : null;
            String noteName = firstParent != null ? firstParent.getName() : null;
            Long noteId = firstParent != null ? firstParent.getId() : null;

            Set<Long> parentTagIds = firstParent != null
                    ? firstParent.getTags().stream().map(Tag::getId).collect(Collectors.toSet())
                    : java.util.Collections.emptySet();
            hotTopics.add(HotTopicItemDTO.builder()
                    .type("subnote")
                    .id(subNote.getId())
                    .title(subNote.getHeader())
                    .details(subNote.getDescription())
                    .noteId(noteId)
                    .noteName(noteName)
                    .bucketId(subNote.getBucketId())
                    .updatedAt(subNote.getUpdatedAt())
                    .tagIds(subNote.getTags().stream().map(Tag::getId).collect(Collectors.toSet()))
                    .parentTagIds(parentTagIds)
                    .teamMemberIds(subNote.getTeamMembers().stream().map(TeamMember::getId).collect(Collectors.toSet()))
                    .build());
        }

        hotTopics.sort(Comparator.comparing(HotTopicItemDTO::getUpdatedAt).reversed());
        return hotTopics;
    }

    @Transactional(readOnly = true)
    public StatsDTO getStats() {
        List<Note> allNotes = noteRepository.findAll();

        long totalNotes = allNotes.stream().filter(n -> !n.getDeleted()).count();
        long favoriteNotes = allNotes.stream().filter(n -> !n.getDeleted() && n.getFavorite()).count();
        long hotTopicNotes = allNotes.stream().filter(n -> !n.getDeleted() && n.getHotTopic()).count();
        long deletedNotes = allNotes.stream().filter(Note::getDeleted).count();

        List<SubNote> allSubNotes = subNoteRepository.findAll();
        long hotTopicSubNotes = allSubNotes.stream().filter(SubNote::getHotTopic).count();

        Map<Long, Long> notesByBucket = allNotes.stream()
                .filter(n -> !n.getDeleted() && n.getBucketId() != null)
                .collect(Collectors.groupingBy(Note::getBucketId, Collectors.counting()));

        Map<Long, Long> notesByTag = new HashMap<>();
        for (Note note : allNotes) {
            if (!note.getDeleted()) {
                for (Tag tag : note.getTags()) {
                    notesByTag.merge(tag.getId(), 1L, Long::sum);
                }
            }
        }

        return StatsDTO.builder()
                .totalNotes(totalNotes)
                .favoriteNotes(favoriteNotes)
                .hotTopicNotes(hotTopicNotes)
                .hotTopicSubNotes(hotTopicSubNotes)
                .deletedNotes(deletedNotes)
                .notesByBucket(notesByBucket)
                .notesByTag(notesByTag)
                .build();
    }

    private SubNoteDTO createSubNoteForNote(Note note, SubNoteCreateRequest request) {
        Set<Tag> tags = tagService.findOrCreateTags(request.getTagNames());
        Set<TeamMember> teamMembers = new HashSet<>();
        if (request.getTeamMemberIds() != null) {
            teamMembers = new HashSet<>(teamMemberService.findAllByIds(new ArrayList<>(request.getTeamMemberIds())));
        }

        SubNote subNote = SubNote.builder()
                .header(request.getHeader())
                .description(request.getDescription())
                .linkedNoteId(request.getLinkedNoteId())
                .bucketId(request.getBucketId())
                .displayOrder(request.getDisplayOrder())
                .hotTopic(request.getHotTopic() != null ? request.getHotTopic() : false)
                .tags(tags)
                .teamMembers(teamMembers)
                .build();

        subNote = subNoteRepository.save(subNote);
        note.getSubNotes().add(subNote);
        noteRepository.save(note);
        return convertSubNoteToDTO(subNote);
    }

    private List<Note> filterNotes(List<Note> notes, Set<Long> tagIds, Set<Long> bucketIds,
                                   Set<Long> teamMemberIds, String trackStatus, String tagMatchMode) {
        if (tagIds != null && !tagIds.isEmpty()) {
            if ("AND".equalsIgnoreCase(tagMatchMode) || "all".equalsIgnoreCase(tagMatchMode)) {
                notes = notes.stream()
                        .filter(note -> {
                            Set<Long> noteTagIds = note.getTags().stream()
                                    .map(Tag::getId).collect(Collectors.toSet());
                            if (noteTagIds.containsAll(tagIds)) return true;
                            // Also include if subnotes have the tags (via own tags or inherited parent tags)
                            if (note.getSubNotes() != null) {
                                for (SubNote sn : note.getSubNotes()) {
                                    Set<Long> combinedTags = new HashSet<>(noteTagIds);
                                    sn.getTags().forEach(t -> combinedTags.add(t.getId()));
                                    if (combinedTags.containsAll(tagIds)) return true;
                                }
                            }
                            return false;
                        })
                        .collect(Collectors.toList());
            } else {
                // OR mode: note matches if note OR any subnote has at least one of the tags
                notes = notes.stream()
                        .filter(note -> {
                            boolean noteHasTag = note.getTags().stream()
                                    .anyMatch(tag -> tagIds.contains(tag.getId()));
                            if (noteHasTag) return true;
                            if (note.getSubNotes() != null) {
                                return note.getSubNotes().stream().anyMatch(sn ->
                                        sn.getTags().stream().anyMatch(t -> tagIds.contains(t.getId())));
                            }
                            return false;
                        })
                        .collect(Collectors.toList());
            }
        }

        if (bucketIds != null && !bucketIds.isEmpty()) {
            notes = notes.stream()
                    .filter(note -> note.getBucketId() != null && bucketIds.contains(note.getBucketId()))
                    .collect(Collectors.toList());
        }

        if (teamMemberIds != null && !teamMemberIds.isEmpty()) {
            notes = notes.stream()
                    .filter(note -> note.getTeamMembers().stream()
                            .anyMatch(tm -> teamMemberIds.contains(tm.getId())))
                    .collect(Collectors.toList());
        }

        if (trackStatus != null) {
            LocalDate today = LocalDate.now();
            if ("tracked".equalsIgnoreCase(trackStatus)) {
                notes = notes.stream()
                        .filter(note -> note.getLastTrackedDate() != null &&
                                note.getLastTrackedDate().toLocalDate().equals(today))
                        .collect(Collectors.toList());
            } else if ("untracked".equalsIgnoreCase(trackStatus)) {
                notes = notes.stream()
                        .filter(note -> note.getLastTrackedDate() == null ||
                                !note.getLastTrackedDate().toLocalDate().equals(today))
                        .collect(Collectors.toList());
            }
        }

        return notes;
    }

    private NoteDTO convertToDTO(Note note) {
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

    private NoteDTO convertToDTOWithSubNotes(Note note) {
        NoteDTO dto = convertToDTO(note);
        dto.setSubNotes(note.getSubNotes().stream()
                .map(this::convertSubNoteToDTO)
                .collect(Collectors.toList()));
        return dto;
    }

    private SubNoteDTO convertSubNoteToDTO(SubNote subNote) {
        Set<Long> parentIds = subNote.getNotes() != null
                ? subNote.getNotes().stream().map(Note::getId).collect(Collectors.toSet())
                : new HashSet<>();
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
                .noteId(parentIds.isEmpty() ? null : parentIds.iterator().next())
                .parentNoteIds(parentIds)
                .tagIds(subNote.getTags().stream().map(Tag::getId).collect(Collectors.toSet()))
                .teamMemberIds(subNote.getTeamMembers().stream().map(TeamMember::getId).collect(Collectors.toSet()))
                .build();
    }
}
