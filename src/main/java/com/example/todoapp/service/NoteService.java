package com.example.todoapp.service;

import com.example.todoapp.model.Note;
import com.example.todoapp.model.SubNote;
import com.example.todoapp.model.Task;
import com.example.todoapp.model.Tag;
import com.example.todoapp.repository.NoteRepository;
import com.example.todoapp.repository.SubNoteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
}
