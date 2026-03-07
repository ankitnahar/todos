package com.example.todoapp.service;

import com.example.todoapp.dto.SearchResultDTO;
import com.example.todoapp.model.Note;
import com.example.todoapp.model.SubNote;
import com.example.todoapp.model.Task;
import com.example.todoapp.model.Tag;
import com.example.todoapp.repository.NoteRepository;
import com.example.todoapp.repository.SubNoteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class NoteService {

    private final NoteRepository noteRepository;
    private final SubNoteRepository subNoteRepository;
    private final TaskService taskService;
    private final TagService tagService;

    @Autowired
    public NoteService(NoteRepository noteRepository, SubNoteRepository subNoteRepository, TaskService taskService, TagService tagService) {
        this.noteRepository = noteRepository;
        this.subNoteRepository = subNoteRepository;
        this.taskService = taskService;
        this.tagService = tagService;
    }

    public List<Note> findAll() {
        return noteRepository.findAllSorted();
    }

    public Optional<Note> findById(Long id) {
        return noteRepository.findById(id);
    }

    public Note findByIdWithSubNotes(Long id) {
        return noteRepository.findByIdWithSubNotes(id);
    }

    public Optional<SubNote> getSubNoteById(Long id) {
        return subNoteRepository.findById(id);
    }

    public Note save(Note note) {
        return noteRepository.save(note);
    }

    public void deleteById(Long id) {
        Optional<Note> noteOpt = noteRepository.findById(id);
        if (noteOpt.isPresent()) {
            Note note = noteOpt.get();
            note.setDeleted(true);
            note.setDeletedAt(java.time.LocalDateTime.now());
            noteRepository.save(note);
        }
    }

    public void hardDeleteById(Long id) {
        noteRepository.deleteById(id);
    }

    public List<Note> findAllDeleted() {
        return noteRepository.findAllDeleted();
    }

    public void restoreNote(Long id) {
        Optional<Note> noteOpt = noteRepository.findById(id);
        if (noteOpt.isPresent()) {
            Note note = noteOpt.get();
            note.setDeleted(false);
            note.setDeletedAt(null);
            noteRepository.save(note);
        }
    }

    public List<Note> searchNotes(String searchText) {
        if (searchText == null || searchText.isBlank()) {
            return findAll();
        }
        return noteRepository.searchNotes(searchText);
    }

    public Task convertToTask(Long noteId) {
        Optional<Note> noteOpt = noteRepository.findById(noteId);
        if (noteOpt.isPresent()) {
            Note note = noteOpt.get();
            Task task = new Task();
            task.setName(note.getName());
            task.setDetails(note.getDetails());
            
            // Copy tags from note to task
            task.setTags(note.getTags());

            // Save the new task
            Task savedTask = taskService.save(task);

            // Delete the note after converting to task (optional)
            // noteRepository.deleteById(noteId);

            return savedTask;
        }
        return null;
    }

    public List<Note> findByTagId(Long tagId) {
        return noteRepository.findByTagId(tagId);
    }

    public List<Note> findByTagName(String tagName) {
        return noteRepository.findByTagName(tagName);
    }

    public List<Note> findByBucketId(Long bucketId) {
        if (bucketId == null) {
            return Collections.emptyList();
        }
        return noteRepository.findByBucketId(bucketId);
    }

    public Note saveWithTags(Note note, Set<String> tagNames) {
        if (tagNames != null && !tagNames.isEmpty()) {
            Set<Tag> tags = tagService.findOrCreateTags(tagNames);
            note.setTags(tags);
        }
        return noteRepository.save(note);
    }

    public List<Note> findNotesFiltered(String search, Set<Long> tagIds) {
        if ((search == null || search.isBlank()) && (tagIds == null || tagIds.isEmpty())) {
            return findAll();
        }
        
        if (tagIds != null && !tagIds.isEmpty()) {
            // If we have tag filters, find notes with those tags and optionally search text
            List<Note> notesWithTags = new ArrayList<>();
            for (Long tagId : tagIds) {
                notesWithTags.addAll(findByTagId(tagId));
            }
            
            // Remove duplicates and apply search filter if needed
            Set<Note> uniqueNotes = new HashSet<>(notesWithTags);
            List<Note> resultList;
            if (search != null && !search.isBlank()) {
                resultList = uniqueNotes.stream()
                    .filter(note -> note.getName().toLowerCase().contains(search.toLowerCase()) ||
                                  (note.getDetails() != null && note.getDetails().toLowerCase().contains(search.toLowerCase())))
                    .collect(java.util.stream.Collectors.toList());
            } else {
                resultList = new ArrayList<>(uniqueNotes);
            }
            // Sort by favorite (desc) and updatedAt (desc)
            resultList.sort((n1, n2) -> {
                int favCompare = Boolean.compare(n2.isFavorite(), n1.isFavorite());
                if (favCompare != 0) return favCompare;
                return n2.getUpdatedAt().compareTo(n1.getUpdatedAt());
            });
            return resultList;
        } else {
            // Only search filter, no tag filter
            return searchNotes(search);
        }
    }

    // SubNote methods
    public Note convertSubNoteToMainNote(Long subNoteId) {
        Optional<SubNote> subNoteOpt = subNoteRepository.findById(subNoteId);
        if (subNoteOpt.isPresent()) {
            SubNote subNote = subNoteOpt.get();
            Note parentNote = subNote.getNote();
            
            // Create new main note from sub-note
            Note newNote = new Note();
            newNote.setName(subNote.getHeader());
            newNote.setDetails(subNote.getDescription());
            newNote.setNested(false);
            
            // Inherit tags from parent note
            if (parentNote != null && parentNote.getTags() != null) {
                newNote.setTags(new HashSet<>(parentNote.getTags()));
            }
            
            // Save the new note first to get its ID
            Note savedNote = noteRepository.save(newNote);
            
            // Create linkage: update subnote to link to the newly created note
            subNote.setLinkedNoteId(savedNote.getId());
            subNote.setDescription(null); // Clear description as it's now linked
            subNoteRepository.save(subNote);
            
            return savedNote;
        }
        return null;
    }
    
    public Map<Long, Note> getLinkedNotesForSubNotes(List<SubNote> subNotes) {
        Map<Long, Note> linkedNotes = new HashMap<>();
        if (subNotes != null) {
            for (SubNote subNote : subNotes) {
                if (subNote.getLinkedNoteId() != null) {
                    Optional<Note> linkedNote = noteRepository.findById(subNote.getLinkedNoteId());
                    linkedNote.ifPresent(note -> linkedNotes.put(subNote.getLinkedNoteId(), note));
                }
            }
        }
        return linkedNotes;
    }
    
    @Transactional
    public void updateSubNoteBucket(Long subNoteId, Long bucketId) {
        Optional<SubNote> subNoteOpt = subNoteRepository.findById(subNoteId);
        if (subNoteOpt.isPresent()) {
            SubNote subNote = subNoteOpt.get();
            subNote.setBucketId(bucketId);
            subNoteRepository.save(subNote);
        }
    }

    @Transactional
    public void moveSubNoteToNote(Long subNoteId, Long targetNoteId) {
        SubNote subNote = subNoteRepository.findById(subNoteId)
            .orElseThrow(() -> new IllegalArgumentException("Sub-note not found"));
        Note sourceNote = subNote.getNote();
        if (sourceNote == null) {
            throw new IllegalArgumentException("Sub-note has no parent note");
        }
        if (sourceNote.getId().equals(targetNoteId)) {
            throw new IllegalArgumentException("Target note must be different from source note");
        }

        Note targetNote = noteRepository.findByIdWithSubNotes(targetNoteId);
        if (targetNote == null) {
            throw new IllegalArgumentException("Target note not found");
        }

        if (!sourceNote.isNested() || sourceNote.getSubNotes() == null || sourceNote.getSubNotes().isEmpty()) {
            throw new IllegalArgumentException("Source note must have sub-notes");
        }
        if (!targetNote.isNested() || targetNote.getSubNotes() == null || targetNote.getSubNotes().isEmpty()) {
            throw new IllegalArgumentException("Target note must have sub-notes");
        }

        int nextOrder = 0;
        if (targetNote.getSubNotes() != null && !targetNote.getSubNotes().isEmpty()) {
            nextOrder = targetNote.getSubNotes().stream()
                .map(SubNote::getDisplayOrder)
                .filter(Objects::nonNull)
                .max(Integer::compareTo)
                .orElse(-1) + 1;
        }
        subNote.setDisplayOrder(nextOrder);
        subNote.setNote(targetNote);

        subNoteRepository.saveAndFlush(subNote);
    }

    public List<Note> findNotesWithSubNotesExcluding(Long excludedNoteId) {
        List<Note> notes = noteRepository.findAllSorted();
        return notes.stream()
            .filter(note -> note.getId() != null && !note.getId().equals(excludedNoteId))
            .filter(Note::isNested)
            .filter(note -> note.getSubNotes() != null && !note.getSubNotes().isEmpty())
            .collect(Collectors.toList());
    }
    
    @Transactional
    public void updateNoteBucket(Long noteId, Long bucketId) {
        Optional<Note> noteOpt = noteRepository.findById(noteId);
        if (noteOpt.isPresent()) {
            Note note = noteOpt.get();
            note.setBucketId(bucketId);
            noteRepository.save(note);
        }
    }
    
    @Transactional
    public Note duplicateNote(Long noteId) {
        Optional<Note> originalNoteOpt = noteRepository.findById(noteId);
        if (originalNoteOpt.isPresent()) {
            Note originalNote = originalNoteOpt.get();
            
            // Create new note with copied data
            Note duplicateNote = new Note();
            duplicateNote.setName(originalNote.getName() + " (Copy)");
            duplicateNote.setDetails(originalNote.getDetails());
            duplicateNote.setFavorite(originalNote.isFavorite());
            duplicateNote.setNested(originalNote.isNested());
            duplicateNote.setBucketId(originalNote.getBucketId());
            
            // Copy tags
            if (originalNote.getTags() != null && !originalNote.getTags().isEmpty()) {
                duplicateNote.setTags(new HashSet<>(originalNote.getTags()));
            }
            
            // Save the duplicate note first to get its ID
            Note savedDuplicate = noteRepository.save(duplicateNote);
            
            // Copy sub-notes if nested
            if (originalNote.isNested() && originalNote.getSubNotes() != null) {
                for (SubNote originalSubNote : originalNote.getSubNotes()) {
                    SubNote duplicateSubNote = new SubNote();
                    duplicateSubNote.setHeader(originalSubNote.getHeader());
                    duplicateSubNote.setDescription(originalSubNote.getDescription());
                    duplicateSubNote.setLinkedNoteId(originalSubNote.getLinkedNoteId());
                    duplicateSubNote.setBucketId(originalSubNote.getBucketId());
                    duplicateSubNote.setDisplayOrder(originalSubNote.getDisplayOrder());
                    duplicateSubNote.setNote(savedDuplicate);
                    
                    savedDuplicate.addSubNote(duplicateSubNote);
                }
                // Save again to persist sub-notes
                savedDuplicate = noteRepository.save(savedDuplicate);
            }
            
            return savedDuplicate;
        }
        return null;
    }

    public SubNote findSubNoteById(Long id) {
        return subNoteRepository.findById(id).orElse(null);
    }

    public SubNote saveSubNote(SubNote subNote) {
        return subNoteRepository.save(subNote);
    }
    
    // Search methods that return SearchResultDTO
    public List<SearchResultDTO> searchAll(String searchText) {
        List<SearchResultDTO> results = new ArrayList<>();
        
        if (searchText == null || searchText.isBlank()) {
            // Return all notes (no subnotes in this case)
            List<Note> notes = findAll();
            for (Note note : notes) {
                results.add(SearchResultDTO.fromNote(note));
            }
            return results;
        }
        
        System.out.println("[SEARCH] Searching for: " + searchText);
        
        // Search notes
        List<Note> matchingNotes = noteRepository.searchNotes(searchText);
        System.out.println("[SEARCH] Found " + matchingNotes.size() + " matching notes");
        for (Note note : matchingNotes) {
            results.add(SearchResultDTO.fromNote(note));
        }
        
        // Search subnotes
        List<SubNote> matchingSubNotes = subNoteRepository.searchSubNotes(searchText);
        System.out.println("[SEARCH] Found " + matchingSubNotes.size() + " matching subnotes");
        for (SubNote subNote : matchingSubNotes) {
            System.out.println("[SEARCH] SubNote: " + subNote.getHeader() + ", Tags: " + (subNote.getTags() != null ? subNote.getTags().size() : 0));
            Note parentNote = subNote.getNote();
            if (parentNote != null && !parentNote.getDeleted()) {
                results.add(SearchResultDTO.fromSubNote(subNote, parentNote));
            }
        }
        
        // Sort results: favorites first, then by updated date
        results.sort((r1, r2) -> {
            int favCompare = Boolean.compare(
                r2.getFavorite() != null && r2.getFavorite(),
                r1.getFavorite() != null && r1.getFavorite()
            );
            if (favCompare != 0) return favCompare;
            
            LocalDateTime date1 = r1.getUpdatedAt() != null ? r1.getUpdatedAt() : r1.getCreatedAt();
            LocalDateTime date2 = r2.getUpdatedAt() != null ? r2.getUpdatedAt() : r2.getCreatedAt();
            if (date1 == null && date2 == null) return 0;
            if (date1 == null) return 1;
            if (date2 == null) return -1;
            return date2.compareTo(date1);
        });
        
        return results;
    }
    
    public List<SearchResultDTO> findByTags(Set<Long> tagIds) {
        return findByTags(tagIds, "AND"); // Default to AND
    }
    
    public List<SearchResultDTO> findByTags(Set<Long> tagIds, String tagMatchMode) {
        List<SearchResultDTO> results = new ArrayList<>();
        Set<String> seenIds = new HashSet<>();
        
        if (tagIds == null || tagIds.isEmpty()) {
            return results;
        }
        
        boolean useAndMode = !"OR".equalsIgnoreCase(tagMatchMode);
        System.out.println("[FIND BY TAGS] Searching for tag IDs: " + tagIds + " with mode: " + (useAndMode ? "AND" : "OR"));
        
        if (useAndMode && tagIds.size() > 1) {
            // AND mode: find notes/subnotes that have ALL specified tags
            // For subnotes, we consider combined tags (subnote's own tags + parent's inherited tags)
            
            // First, find notes with ALL tags
            List<Note> notesWithAllTags = noteRepository.findByAllTagIds(tagIds, tagIds.size());
            System.out.println("[FIND BY TAGS] Found " + notesWithAllTags.size() + " notes with ALL tags (AND mode)");
            for (Note note : notesWithAllTags) {
                if (!note.getDeleted()) {
                    boolean hasSubNotes = note.getSubNotes() != null && !note.getSubNotes().isEmpty();
                    
                    // Only include the note itself if it has NO subnotes (not a container)
                    if (!hasSubNotes) {
                        String noteKey = "NOTE_" + note.getId();
                        if (seenIds.add(noteKey)) {
                            results.add(SearchResultDTO.fromNote(note));
                        }
                    } else {
                        // Include all subnotes of this note (they inherit parent's tags, so they also have ALL tags)
                        for (SubNote subNote : note.getSubNotes()) {
                            String subNoteKey = "SUBNOTE_" + subNote.getId();
                            if (seenIds.add(subNoteKey)) {
                                results.add(SearchResultDTO.fromSubNote(subNote, note));
                                System.out.println("[FIND BY TAGS] Including subnote '" + subNote.getHeader() + "' (parent has all tags)");
                            }
                        }
                    }
                }
            }
            
            // Also find subnotes that directly have ALL tags
            List<SubNote> subNotesWithAllTags = subNoteRepository.findByAllTagIds(tagIds, tagIds.size());
            System.out.println("[FIND BY TAGS] Found " + subNotesWithAllTags.size() + " subnotes with ALL tags directly (AND mode)");
            for (SubNote subNote : subNotesWithAllTags) {
                Note parentNote = subNote.getNote();
                if (parentNote != null && !parentNote.getDeleted()) {
                    String subNoteKey = "SUBNOTE_" + subNote.getId();
                    if (seenIds.add(subNoteKey)) {
                        results.add(SearchResultDTO.fromSubNote(subNote, parentNote));
                    }
                }
            }
            
            // NEW: Find subnotes where COMBINED tags (own + inherited from parent) satisfy ALL search tags
            // This handles the case where subnote has "Bug" and parent has "26.Q1" - together they match "Bug AND 26.Q1"
            List<SubNote> allSubNotes = subNoteRepository.findAll();
            System.out.println("[FIND BY TAGS] Checking " + allSubNotes.size() + " subnotes for combined tag match");
            for (SubNote subNote : allSubNotes) {
                Note parentNote = subNote.getNote();
                if (parentNote != null && !parentNote.getDeleted()) {
                    String subNoteKey = "SUBNOTE_" + subNote.getId();
                    if (!seenIds.contains(subNoteKey)) {
                        // Compute combined tags: subnote's own tags + parent's tags
                        Set<Long> combinedTagIds = new HashSet<>();
                        if (subNote.getTags() != null) {
                            for (var tag : subNote.getTags()) {
                                combinedTagIds.add(tag.getId());
                            }
                        }
                        if (parentNote.getTags() != null) {
                            for (var tag : parentNote.getTags()) {
                                combinedTagIds.add(tag.getId());
                            }
                        }
                        
                        // Check if combined tags contain ALL search tags
                        if (combinedTagIds.containsAll(tagIds)) {
                            seenIds.add(subNoteKey);
                            results.add(SearchResultDTO.fromSubNote(subNote, parentNote));
                            System.out.println("[FIND BY TAGS] Including subnote '" + subNote.getHeader() + "' (combined tags match all search tags)");
                        }
                    }
                }
            }
        } else {
            // OR mode (or single tag): find notes/subnotes with ANY of the specified tags
            for (Long tagId : tagIds) {
                List<Note> notesWithTag = noteRepository.findByTagId(tagId);
                System.out.println("[FIND BY TAGS] Found " + notesWithTag.size() + " notes with tag ID " + tagId);
                for (Note note : notesWithTag) {
                    if (!note.getDeleted()) {
                        boolean hasSubNotes = note.getSubNotes() != null && !note.getSubNotes().isEmpty();
                        
                        // Only include the note itself if it has NO subnotes (not a container)
                        if (!hasSubNotes) {
                            String noteKey = "NOTE_" + note.getId();
                            if (seenIds.add(noteKey)) {
                                results.add(SearchResultDTO.fromNote(note));
                            }
                        } else {
                            // Include all subnotes of this note (they inherit parent's tags)
                            for (SubNote subNote : note.getSubNotes()) {
                                String subNoteKey = "SUBNOTE_" + subNote.getId();
                                if (seenIds.add(subNoteKey)) {
                                    results.add(SearchResultDTO.fromSubNote(subNote, note));
                                    System.out.println("[FIND BY TAGS] Including subnote '" + subNote.getHeader() + "' (inherits parent tag " + tagId + ")");
                                }
                            }
                        }
                    }
                }
                
                // Also find subnotes that directly have this tag
                List<SubNote> subNotesWithTag = subNoteRepository.findByTagId(tagId);
                System.out.println("[FIND BY TAGS] Found " + subNotesWithTag.size() + " subnotes with tag ID " + tagId + " directly");
                for (SubNote subNote : subNotesWithTag) {
                    Note parentNote = subNote.getNote();
                    if (parentNote != null && !parentNote.getDeleted()) {
                        String subNoteKey = "SUBNOTE_" + subNote.getId();
                        if (seenIds.add(subNoteKey)) {
                            results.add(SearchResultDTO.fromSubNote(subNote, parentNote));
                        }
                    }
                }
            }
        }
        
        // Sort results: favorites first, then by updated date
        results.sort((r1, r2) -> {
            int favCompare = Boolean.compare(
                r2.getFavorite() != null && r2.getFavorite(),
                r1.getFavorite() != null && r1.getFavorite()
            );
            if (favCompare != 0) return favCompare;
            
            LocalDateTime date1 = r1.getUpdatedAt() != null ? r1.getUpdatedAt() : r1.getCreatedAt();
            LocalDateTime date2 = r2.getUpdatedAt() != null ? r2.getUpdatedAt() : r2.getCreatedAt();
            if (date1 == null && date2 == null) return 0;
            if (date1 == null) return 1;
            if (date2 == null) return -1;
            return date2.compareTo(date1);
        });
        
        System.out.println("[FIND BY TAGS] Returning " + results.size() + " total results");
        return results;
    }
    
    public List<SearchResultDTO> findByBucket(Long bucketId) {
        List<SearchResultDTO> results = new ArrayList<>();
        
        if (bucketId == null) {
            return results;
        }
        
        System.out.println("[FIND BY BUCKET] Searching for bucket ID: " + bucketId);
        
        // Find notes with this bucket - but only include if they have NO subnotes
        // For nested notes, the bucket on parent is meaningless - only subnote buckets matter
        List<Note> notesWithBucket = noteRepository.findByBucketId(bucketId);
        System.out.println("[FIND BY BUCKET] Found " + notesWithBucket.size() + " notes with bucket ID " + bucketId);
        for (Note note : notesWithBucket) {
            // Load subnotes to check if this is a nested note
            Note noteWithSubNotes = noteRepository.findByIdWithSubNotes(note.getId());
            boolean hasSubNotes = noteWithSubNotes != null && noteWithSubNotes.getSubNotes() != null && !noteWithSubNotes.getSubNotes().isEmpty();
            
            // Only include the note if it has NO subnotes (not a container)
            if (!hasSubNotes) {
                results.add(SearchResultDTO.fromNote(note));
                System.out.println("[FIND BY BUCKET] Including note '" + note.getName() + "' (no subnotes)");
            } else {
                System.out.println("[FIND BY BUCKET] Skipping nested note '" + note.getName() + "' - bucket on parent is meaningless");
            }
        }
        
        // Find subnotes with this bucket
        List<SubNote> subNotesWithBucket = subNoteRepository.findAllByBucketId(bucketId);
        System.out.println("[FIND BY BUCKET] Found " + subNotesWithBucket.size() + " subnotes with bucket ID " + bucketId);
        for (SubNote subNote : subNotesWithBucket) {
            Note parentNote = subNote.getNote();
            if (parentNote != null && !parentNote.getDeleted()) {
                results.add(SearchResultDTO.fromSubNote(subNote, parentNote));
            }
        }
        
        // Sort results: favorites first, then by updated date
        results.sort((r1, r2) -> {
            int favCompare = Boolean.compare(
                r2.getFavorite() != null && r2.getFavorite(),
                r1.getFavorite() != null && r1.getFavorite()
            );
            if (favCompare != 0) return favCompare;
            
            LocalDateTime date1 = r1.getUpdatedAt() != null ? r1.getUpdatedAt() : r1.getCreatedAt();
            LocalDateTime date2 = r2.getUpdatedAt() != null ? r2.getUpdatedAt() : r2.getCreatedAt();
            if (date1 == null && date2 == null) return 0;
            if (date1 == null) return 1;
            if (date2 == null) return -1;
            return date2.compareTo(date1);
        });
        
        System.out.println("[FIND BY BUCKET] Returning " + results.size() + " total results");
        return results;
    }
    
    /**
     * Find all notes and subnotes that belong to ANY of the provided bucket IDs (OR condition)
     */
    public List<SearchResultDTO> findByBuckets(Set<Long> bucketIds) {
        List<SearchResultDTO> results = new ArrayList<>();
        Set<String> resultKeys = new HashSet<>();
        
        if (bucketIds == null || bucketIds.isEmpty()) {
            return results;
        }
        
        System.out.println("[FIND BY BUCKETS] Searching for bucket IDs: " + bucketIds);
        
        // Find notes and subnotes for each bucket (OR condition)
        for (Long bucketId : bucketIds) {
            List<SearchResultDTO> bucketResults = findByBucket(bucketId);
            for (SearchResultDTO result : bucketResults) {
                String key = result.getType() + "_" + result.getId();
                if (resultKeys.add(key)) {
                    results.add(result);
                }
            }
        }
        
        // Sort results: favorites first, then by updated date
        results.sort((r1, r2) -> {
            int favCompare = Boolean.compare(
                r2.getFavorite() != null && r2.getFavorite(),
                r1.getFavorite() != null && r1.getFavorite()
            );
            if (favCompare != 0) return favCompare;
            
            LocalDateTime date1 = r1.getUpdatedAt() != null ? r1.getUpdatedAt() : r1.getCreatedAt();
            LocalDateTime date2 = r2.getUpdatedAt() != null ? r2.getUpdatedAt() : r2.getCreatedAt();
            if (date1 == null && date2 == null) return 0;
            if (date1 == null) return 1;
            if (date2 == null) return -1;
            return date2.compareTo(date1);
        });
        
        System.out.println("[FIND BY BUCKETS] Returning " + results.size() + " total results");
        return results;
    }
    
    public List<SearchResultDTO> findByFilters(String search, Set<Long> tagIds, Set<Long> bucketIds) {
        return findByFilters(search, tagIds, bucketIds, "AND"); // Default to AND
    }
    
    public List<SearchResultDTO> findByFilters(String search, Set<Long> tagIds, Set<Long> bucketIds, String tagMatchMode) {
        List<SearchResultDTO> results = new ArrayList<>();
        Set<String> resultKeys = new HashSet<>();
        
        // Search by text if provided
        if (search != null && !search.isBlank()) {
            List<SearchResultDTO> searchResults = searchAll(search);
            for (SearchResultDTO result : searchResults) {
                String key = result.getType() + "_" + result.getId();
                if (resultKeys.add(key)) {
                    results.add(result);
                }
            }
        }
        
        // Filter by tags if provided
        if (tagIds != null && !tagIds.isEmpty()) {
            List<SearchResultDTO> tagResults = findByTags(tagIds, tagMatchMode);
            if (search != null && !search.isBlank()) {
                // Intersect with existing results
                Set<String> currentKeys = new HashSet<>(resultKeys);
                resultKeys.clear();
                results.clear();
                for (SearchResultDTO result : tagResults) {
                    String key = result.getType() + "_" + result.getId();
                    if (currentKeys.contains(key)) {
                        resultKeys.add(key);
                        results.add(result);
                    }
                }
            } else {
                // No search, just add tag results
                for (SearchResultDTO result : tagResults) {
                    String key = result.getType() + "_" + result.getId();
                    if (resultKeys.add(key)) {
                        results.add(result);
                    }
                }
            }
        }
        
        // Filter by buckets if provided (OR condition between buckets)
        if (bucketIds != null && !bucketIds.isEmpty()) {
            List<SearchResultDTO> bucketResults = findByBuckets(bucketIds);
            if ((search != null && !search.isBlank()) || (tagIds != null && !tagIds.isEmpty())) {
                // Intersect with existing results
                Set<String> currentKeys = new HashSet<>(resultKeys);
                resultKeys.clear();
                results.clear();
                for (SearchResultDTO result : bucketResults) {
                    String key = result.getType() + "_" + result.getId();
                    if (currentKeys.contains(key)) {
                        resultKeys.add(key);
                        results.add(result);
                    }
                }
            } else {
                // No search or tags, just add bucket results
                for (SearchResultDTO result : bucketResults) {
                    String key = result.getType() + "_" + result.getId();
                    if (resultKeys.add(key)) {
                        results.add(result);
                    }
                }
            }
        }
        
        // Sort results: favorites first, then by updated date
        results.sort((r1, r2) -> {
            int favCompare = Boolean.compare(
                r2.getFavorite() != null && r2.getFavorite(),
                r1.getFavorite() != null && r1.getFavorite()
            );
            if (favCompare != 0) return favCompare;
            
            LocalDateTime date1 = r1.getUpdatedAt() != null ? r1.getUpdatedAt() : r1.getCreatedAt();
            LocalDateTime date2 = r2.getUpdatedAt() != null ? r2.getUpdatedAt() : r2.getCreatedAt();
            if (date1 == null && date2 == null) return 0;
            if (date1 == null) return 1;
            if (date2 == null) return -1;
            return date2.compareTo(date1);
        });
        
        return results;
    }
    
    public SubNote saveSubNoteWithTags(SubNote subNote, Set<String> tagNames) {
        if (tagNames != null && !tagNames.isEmpty()) {
            Set<Tag> tags = tagService.findOrCreateTags(tagNames);
            subNote.setTags(tags);
        }
        return subNoteRepository.save(subNote);
    }
}
