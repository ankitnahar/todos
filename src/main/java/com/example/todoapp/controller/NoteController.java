package com.example.todoapp.controller;

import com.example.todoapp.dto.SearchResultDTO;
import com.example.todoapp.model.Note;
import com.example.todoapp.model.SubNote;
import com.example.todoapp.model.Task;
import com.example.todoapp.model.Tag;
import com.example.todoapp.model.Bucket;
import com.example.todoapp.service.NoteService;
import com.example.todoapp.service.TagService;
import com.example.todoapp.service.BucketService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.util.*;
import java.util.stream.Collectors;

@Controller
@RequestMapping("/notes")
public class NoteController {

    private final NoteService noteService;
    private final TagService tagService;
    private final BucketService bucketService;

    @Autowired
    public NoteController(NoteService noteService, TagService tagService, BucketService bucketService) {
        this.noteService = noteService;
        this.tagService = tagService;
        this.bucketService = bucketService;
    }

    @GetMapping
    public String listNotes(Model model,
                           @RequestParam(required = false) String search,
                           @RequestParam(required = false) List<Long> tagIds,
                           @RequestParam(required = false) Long bucketId,
                           @RequestParam(required = false) String quickFilter,
                           HttpServletRequest request) {
        
        // Get all tags and buckets for the filter dropdown
        List<Tag> allTags = tagService.findAll();
        List<Bucket> allBuckets = bucketService.getAllBuckets();
        model.addAttribute("allTags", allTags);
        model.addAttribute("allBuckets", allBuckets);
        
        // Apply filters
        boolean hasFilters = (search != null && !search.isBlank()) || (tagIds != null && !tagIds.isEmpty()) || (bucketId != null);
        
        if (hasFilters) {
            // Use combined filter method that handles search, tags, and bucket together
            Set<Long> tagIdSet = tagIds != null ? new HashSet<>(tagIds) : Collections.emptySet();
            List<SearchResultDTO> searchResults = noteService.findByFilters(search, tagIdSet, bucketId);
            model.addAttribute("searchResults", searchResults);
            model.addAttribute("notes", Collections.emptyList()); // Empty for backward compatibility
        } else {
            // No filters - show all notes
            List<Note> notes = noteService.findAll();
            model.addAttribute("notes", notes);
            model.addAttribute("searchResults", Collections.emptyList());
        }
        
        Set<Long> tagIdSet = tagIds != null ? new HashSet<>(tagIds) : Collections.emptySet();
        model.addAttribute("search", search);
        model.addAttribute("selectedTagIds", tagIdSet);
        model.addAttribute("selectedBucketId", bucketId);
        
        // Build applied filters label
        StringBuilder filterLabel = new StringBuilder();
        if (search != null && !search.isBlank()) filterLabel.append("Search: ").append(search).append("; ");
        if (tagIdSet != null && !tagIdSet.isEmpty()) filterLabel.append("Tags: ").append(
                allTags.stream().filter(t -> tagIdSet.contains(t.getId())).map(Tag::getName)
                        .collect(Collectors.joining(", "))).append("; ");
        if (bucketId != null) {
            allBuckets.stream().filter(b -> b.getId().equals(bucketId)).findFirst()
                    .ifPresent(b -> filterLabel.append("Bucket: ").append(b.getName()).append("; "));
        }
        
        model.addAttribute("appliedFilters", filterLabel.length() > 0 ? filterLabel.toString() : "");

        // Store or retrieve the quick filter preference
        HttpSession session = request.getSession();
        if (quickFilter != null) {
            // If a new filter is provided, update it
            session.setAttribute("lastQuickFilter", quickFilter);
        } else if (session.getAttribute("lastQuickFilter") == null) {
            // Default to "today" if nothing is stored
            session.setAttribute("lastQuickFilter", "today");
        }

        // Add the current quick filter to the model
        model.addAttribute("lastQuickFilter", session.getAttribute("lastQuickFilter"));

        return "note-list";
    }

    @GetMapping("/add")
    public String showAddForm(Model model) {
        model.addAttribute("note", new Note());
        List<Tag> allTags = tagService.findAll();
        model.addAttribute("allTags", allTags);
        model.addAttribute("allBuckets", bucketService.getAllBuckets());
        
        // Create JSON string for tags
        StringBuilder tagsJson = new StringBuilder("[");
        if (allTags != null) {
            boolean first = true;
            for (Tag tag : allTags) {
                if (tag != null && tag.getName() != null) {
                    if (!first) tagsJson.append(",");
                    tagsJson.append("{")
                        .append("\"id\":").append(tag.getId()).append(",")
                        .append("\"name\":\"").append(escapeJson(tag.getName())).append("\"")
                        .append("}");
                    first = false;
                }
            }
        }
        tagsJson.append("]");
        model.addAttribute("tagsJson", tagsJson.toString());
        
        return "add-note";
    }

    @PostMapping("/add")
    public String addNote(@Valid @ModelAttribute("note") Note note, 
                         BindingResult result, 
                         @RequestParam(required = false) List<Long> tagIds,
                         @RequestParam(required = false) Long bucketId,
                         @RequestParam(required = false) Boolean nested,
                         @RequestParam(required = false) List<String> subNoteHeaders,
                         @RequestParam(required = false) List<String> subNoteDescriptions,
                         @RequestParam(required = false) List<Long> subNoteBucketIds,
                         @RequestParam(required = false) List<String> subNoteTagIds,
                         Model model) {
        if (result.hasErrors()) {
            model.addAttribute("allTags", tagService.findAll());
            model.addAttribute("allBuckets", bucketService.getAllBuckets());
            return "add-note";
        }
        
        // Handle tags by IDs
        if (tagIds != null && !tagIds.isEmpty()) {
            List<Tag> selectedTags = tagService.findAllByIds(tagIds);
            note.setTags(new HashSet<>(selectedTags));
        }
        
        // Get default bucket
        Bucket defaultBucket = bucketService.getDefaultBucket();
        
        // Set bucket ID for the note (default to "Today" if not specified)
        if (bucketId != null) {
            note.setBucketId(bucketId);
        } else if (defaultBucket != null) {
            note.setBucketId(defaultBucket.getId());
        }
        
        // Handle nested flag and sub-notes
        note.setNested(nested != null && nested);
        if (note.isNested() && subNoteHeaders != null && !subNoteHeaders.isEmpty()) {
            for (int i = 0; i < subNoteHeaders.size(); i++) {
                if (subNoteHeaders.get(i) != null && !subNoteHeaders.get(i).trim().isEmpty()) {
                    SubNote subNote = new SubNote();
                    subNote.setHeader(subNoteHeaders.get(i));
                    subNote.setDescription(subNoteDescriptions != null && i < subNoteDescriptions.size() 
                        ? subNoteDescriptions.get(i) : "");
                    subNote.setDisplayOrder(i);
                    
                    // Set bucket ID (default to "Today" if not specified)
                    if (subNoteBucketIds != null && i < subNoteBucketIds.size() && subNoteBucketIds.get(i) != null) {
                        subNote.setBucketId(subNoteBucketIds.get(i));
                    } else if (defaultBucket != null) {
                        subNote.setBucketId(defaultBucket.getId());
                    }
                    
                    // Handle subnote tags
                    if (subNoteTagIds != null && i < subNoteTagIds.size() && subNoteTagIds.get(i) != null && !subNoteTagIds.get(i).isEmpty()) {
                        String[] tagIdArray = subNoteTagIds.get(i).split(",");
                        Set<Tag> subNoteTags = new HashSet<>();
                        System.out.println("[NOTE CONTROLLER CREATE] SubNote " + i + " tags: " + subNoteTagIds.get(i));
                        for (String tagIdStr : tagIdArray) {
                            try {
                                Long tagId = Long.parseLong(tagIdStr.trim());
                                tagService.findById(tagId).ifPresent(tag -> {
                                    subNoteTags.add(tag);
                                    System.out.println("[NOTE CONTROLLER CREATE] Added tag: " + tag.getName());
                                });
                            } catch (NumberFormatException e) {
                                // Skip invalid tag IDs
                            }
                        }
                        subNote.setTags(subNoteTags);
                        System.out.println("[NOTE CONTROLLER CREATE] SubNote final tag count: " + subNoteTags.size());
                    } else {
                        System.out.println("[NOTE CONTROLLER CREATE] SubNote " + i + " has no tags");
                    }
                    
                    note.addSubNote(subNote);
                }
            }
        }
        
        noteService.save(note);
        return "redirect:/notes";
    }

    @GetMapping("/{id}")
    public String viewNote(@PathVariable("id") Long id, Model model) {
        Note note = noteService.findByIdWithSubNotes(id);
        if (note == null) {
            throw new IllegalArgumentException("Invalid note Id:" + id);
        }
        model.addAttribute("note", note);
        
        // Get all buckets
        model.addAttribute("allBuckets", bucketService.getAllBuckets());
        
        // Get linked notes for subnotes
        if (note.isNested() && note.getSubNotes() != null) {
            Map<Long, Note> linkedNotes = noteService.getLinkedNotesForSubNotes(note.getSubNotes());
            model.addAttribute("linkedNotes", linkedNotes);
        }
        
        return "note-detail";
    }

    @GetMapping("/{id}/edit")
    public String showEditForm(@PathVariable("id") Long id, Model model) {
        Note note = noteService.findByIdWithSubNotes(id);
        if (note == null) {
            throw new IllegalArgumentException("Invalid note Id:" + id);
        }
        model.addAttribute("note", note);
        model.addAttribute("allTags", tagService.findAll());
        // Filter out any null buckets
        List<Bucket> buckets = bucketService.getAllBuckets();
        System.out.println("[NOTE CONTROLLER] showEditForm - Before filter: " + (buckets != null ? buckets.size() : "NULL") + " buckets");
        
        if (buckets != null) {
            buckets = buckets.stream().filter(b -> b != null).collect(Collectors.toList());
            System.out.println("[NOTE CONTROLLER] showEditForm - After filter: " + buckets.size() + " buckets");
        } else {
            buckets = new ArrayList<>();
            System.out.println("[NOTE CONTROLLER] showEditForm - Buckets was NULL, created empty list");
        }
        
        for (int i = 0; i < buckets.size(); i++) {
            Bucket b = buckets.get(i);
            System.out.println("[NOTE CONTROLLER] showEditForm - Bucket[" + i + "]: " + (b != null ? b.getId() + " - " + b.getName() : "NULL"));
        }
        
        model.addAttribute("allBuckets", buckets);
        
        // Get all notes for linking (excluding the current note)
        List<Note> allNotes = noteService.findAll();
        allNotes.removeIf(n -> n.getId().equals(id));
        model.addAttribute("allNotes", allNotes);
        
        // Create JSON string for sub-notes to pass safely to JavaScript
        if (note.isNested() && note.getSubNotes() != null && !note.getSubNotes().isEmpty()) {
            StringBuilder subNotesJson = new StringBuilder("[");
            for (int i = 0; i < note.getSubNotes().size(); i++) {
                var subNote = note.getSubNotes().get(i);
                if (subNote != null) {
                    if (i > 0) subNotesJson.append(",");
                    subNotesJson.append("{")
                        .append("\"id\":").append(subNote.getId()).append(",")
                        .append("\"header\":\"").append(escapeJson(subNote.getHeader())).append("\",")
                        .append("\"description\":\"").append(escapeJson(subNote.getDescription())).append("\",")
                        .append("\"linkedNoteId\":").append(subNote.getLinkedNoteId() != null ? subNote.getLinkedNoteId() : "null").append(",")
                        .append("\"bucketId\":").append(subNote.getBucketId() != null ? subNote.getBucketId() : "null").append(",")
                        .append("\"tagIds\":[");
                    
                    // Add tag IDs
                    if (subNote.getTags() != null && !subNote.getTags().isEmpty()) {
                        int tagIndex = 0;
                        for (Tag tag : subNote.getTags()) {
                            if (tagIndex > 0) subNotesJson.append(",");
                            subNotesJson.append(tag.getId());
                            tagIndex++;
                        }
                    }
                    subNotesJson.append("]")
                        .append("}");
                }
            }
            subNotesJson.append("]");
            model.addAttribute("subNotesJson", subNotesJson.toString());
        } else {
            model.addAttribute("subNotesJson", "[]");
        }
        
        // Create JSON string for tags
        List<Tag> allTags = tagService.findAll();
        StringBuilder tagsJson = new StringBuilder("[");
        if (allTags != null) {
            boolean first = true;
            for (Tag tag : allTags) {
                if (tag != null && tag.getName() != null) {
                    if (!first) tagsJson.append(",");
                    tagsJson.append("{")
                        .append("\"id\":").append(tag.getId()).append(",")
                        .append("\"name\":\"").append(escapeJson(tag.getName())).append("\"")
                        .append("}");
                    first = false;
                }
            }
        }
        tagsJson.append("]");
        model.addAttribute("tagsJson", tagsJson.toString());
        
        return "edit-note";
    }
    
    private String escapeJson(String str) {
        if (str == null) return "";
        return str.replace("\\", "\\\\")
                  .replace("\"", "\\\"")
                  .replace("\n", "\\n")
                  .replace("\r", "\\r")
                  .replace("\t", "\\t");
    }

    @PostMapping("/{id}/edit")
    public String updateNote(@PathVariable("id") Long id, 
                           @Valid @ModelAttribute("note") Note note,
                           BindingResult result,
                           @RequestParam(required = false) List<Long> tagIds,
                           @RequestParam(required = false) Long bucketId,
                           @RequestParam(required = false) Boolean nested,
                           @RequestParam(required = false) List<String> subNoteHeaders,
                           @RequestParam(required = false) List<String> subNoteDescriptions,
                           @RequestParam(required = false) List<Long> subNoteIds,
                           @RequestParam(required = false) List<Long> subNoteLinkedNoteIds,
                           @RequestParam(required = false) List<Long> subNoteBucketIds,
                           @RequestParam(required = false) List<String> subNoteTagIds,
                           Model model,
                           RedirectAttributes redirectAttributes) {
        if (result.hasErrors()) {
            note.setId(id);
            model.addAttribute("allTags", tagService.findAll());
            model.addAttribute("allBuckets", bucketService.getAllBuckets());
            return "edit-note";
        }
        
        // Get existing note
        Note existingNote = noteService.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Invalid note Id:" + id));
        
        note.setId(id);
        
        // Preserve lastTrackedDate
        note.setLastTrackedDate(existingNote.getLastTrackedDate());
        
        // Handle tags by IDs
        if (tagIds != null && !tagIds.isEmpty()) {
            List<Tag> selectedTags = tagService.findAllByIds(tagIds);
            note.setTags(new HashSet<>(selectedTags));
        } else {
            note.setTags(new HashSet<>());
        }
        
        // Get default bucket
        Bucket defaultBucket = bucketService.getDefaultBucket();
        
        // Set bucket ID for the note (default to "Today" if not specified)
        if (bucketId != null) {
            note.setBucketId(bucketId);
        } else if (defaultBucket != null) {
            note.setBucketId(defaultBucket.getId());
        }
        
        // Handle nested flag and sub-notes
        boolean wantsNested = nested != null && nested;
        int existingSubNotesCount = existingNote.getSubNotes() != null ? existingNote.getSubNotes().size() : 0;
        
        // Create final reference for lambda
        final Note finalExistingNote = existingNote;
        
        // Validation: Can't disable nested if more than 1 sub-note exists
        if (!wantsNested && existingSubNotesCount > 1) {
            redirectAttributes.addFlashAttribute("error", 
                "Cannot disable nested mode while having multiple sub-notes. Please delete sub-notes to have only 1 remaining.");
            return "redirect:/notes/" + id + "/edit";
        }
        
        note.setNested(wantsNested);
        
        // Clear existing sub-notes and add new ones
        note.getSubNotes().clear();
        
        if (note.isNested() && subNoteHeaders != null && !subNoteHeaders.isEmpty()) {
            for (int i = 0; i < subNoteHeaders.size(); i++) {
                if (subNoteHeaders.get(i) != null && !subNoteHeaders.get(i).trim().isEmpty()) {
                    SubNote subNote = new SubNote();
                    
                    // If we have an existing sub-note ID, preserve it and its lastTrackedDate
                    if (subNoteIds != null && i < subNoteIds.size() && subNoteIds.get(i) != null) {
                        Long subNoteId = subNoteIds.get(i);
                        subNote.setId(subNoteId);
                        
                        // Find and preserve lastTrackedDate from existing subnote
                        for (SubNote existingSubNote : finalExistingNote.getSubNotes()) {
                            if (existingSubNote.getId().equals(subNoteId)) {
                                subNote.setLastTrackedDate(existingSubNote.getLastTrackedDate());
                                break;
                            }
                        }
                    }
                    
                    subNote.setHeader(subNoteHeaders.get(i));
                    
                    // Set bucket ID (default to "Today" if not specified)
                    if (subNoteBucketIds != null && i < subNoteBucketIds.size() && subNoteBucketIds.get(i) != null) {
                        subNote.setBucketId(subNoteBucketIds.get(i));
                    } else if (defaultBucket != null) {
                        subNote.setBucketId(defaultBucket.getId());
                    }
                    
                    // Handle linked note or description
                    if (subNoteLinkedNoteIds != null && i < subNoteLinkedNoteIds.size() && subNoteLinkedNoteIds.get(i) != null && subNoteLinkedNoteIds.get(i) > 0) {
                        // This subnote is linked to another note
                        subNote.setLinkedNoteId(subNoteLinkedNoteIds.get(i));
                        subNote.setDescription(null); // Clear description when linked
                    } else {
                        // This subnote has its own description
                        subNote.setDescription(subNoteDescriptions != null && i < subNoteDescriptions.size() 
                            ? subNoteDescriptions.get(i) : "");
                        subNote.setLinkedNoteId(null); // Clear link when has description
                    }
                    
                    // Handle subnote tags
                    if (subNoteTagIds != null && i < subNoteTagIds.size() && subNoteTagIds.get(i) != null && !subNoteTagIds.get(i).isEmpty()) {
                        String[] tagIdArray = subNoteTagIds.get(i).split(",");
                        Set<Tag> subNoteTags = new HashSet<>();
                        System.out.println("[NOTE CONTROLLER UPDATE] SubNote " + i + " tags: " + subNoteTagIds.get(i));
                        for (String tagIdStr : tagIdArray) {
                            try {
                                Long tagId = Long.parseLong(tagIdStr.trim());
                                tagService.findById(tagId).ifPresent(tag -> {
                                    subNoteTags.add(tag);
                                    System.out.println("[NOTE CONTROLLER UPDATE] Added tag: " + tag.getName());
                                });
                            } catch (NumberFormatException e) {
                                // Skip invalid tag IDs
                            }
                        }
                        subNote.setTags(subNoteTags);
                        System.out.println("[NOTE CONTROLLER UPDATE] SubNote final tag count: " + subNoteTags.size());
                    } else {
                        System.out.println("[NOTE CONTROLLER UPDATE] SubNote " + i + " has no tags");
                    }
                    
                    subNote.setDisplayOrder(i);
                    note.addSubNote(subNote);
                }
            }
        }
        
        noteService.save(note);
        return "redirect:/notes";
    }

    @GetMapping("/{id}/delete")
    public String deleteNote(@PathVariable("id") Long id) {
        noteService.deleteById(id);
        return "redirect:/notes";
    }

    @GetMapping("/{id}/convert")
    public String convertToTask(@PathVariable("id") Long id, RedirectAttributes redirectAttributes) {
        Task task = noteService.convertToTask(id);
        if (task != null) {
            redirectAttributes.addFlashAttribute("success", "Note converted to task successfully");
            return "redirect:/tasks/" + task.getId();
        } else {
            redirectAttributes.addFlashAttribute("error", "Failed to convert note to task");
            return "redirect:/notes";
        }
    }

    @PostMapping("/{id}/toggle-favorite")
    @ResponseBody
    public Map<String, Object> toggleFavorite(@PathVariable("id") Long id) {
        Map<String, Object> response = new HashMap<>();
        try {
            Note note = noteService.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Invalid note Id:" + id));
            note.setFavorite(!note.isFavorite());
            noteService.save(note);
            response.put("success", true);
            response.put("favorite", note.isFavorite());
        } catch (Exception e) {
            response.put("success", false);
            response.put("error", e.getMessage());
        }
        return response;
    }

    @GetMapping("/deleted")
    public String listDeletedNotes(Model model) {
        List<Note> deletedNotes = noteService.findAllDeleted();
        model.addAttribute("notes", deletedNotes);
        return "deleted-notes";
    }

    @GetMapping("/{id}/restore")
    public String restoreNote(@PathVariable("id") Long id, RedirectAttributes redirectAttributes) {
        try {
            noteService.restoreNote(id);
            redirectAttributes.addFlashAttribute("success", "Note restored successfully");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error", "Failed to restore note: " + e.getMessage());
        }
        return "redirect:/notes/deleted";
    }

    @GetMapping("/{id}/hard-delete")
    public String hardDeleteNote(@PathVariable("id") Long id, RedirectAttributes redirectAttributes) {
        try {
            noteService.hardDeleteById(id);
            redirectAttributes.addFlashAttribute("success", "Note permanently deleted");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error", "Failed to delete note: " + e.getMessage());
        }
        return "redirect:/notes/deleted";
    }

    @PostMapping("/{noteId}/subnote/convert/{subNoteId}")
    public String convertSubNoteToMainNote(@PathVariable("noteId") Long noteId,
                                           @PathVariable("subNoteId") Long subNoteId,
                                           RedirectAttributes redirectAttributes) {
        try {
            Note newNote = noteService.convertSubNoteToMainNote(subNoteId);
            if (newNote != null) {
                redirectAttributes.addFlashAttribute("success", "Sub-note converted to main note successfully");
                return "redirect:/notes/" + newNote.getId();
            } else {
                redirectAttributes.addFlashAttribute("error", "Failed to convert sub-note");
                return "redirect:/notes/" + noteId;
            }
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error", "Failed to convert sub-note: " + e.getMessage());
            return "redirect:/notes/" + noteId;
        }
    }
    
    @PostMapping("/subnote/{subNoteId}/move-bucket")
    @ResponseBody
    public Map<String, Object> moveSubNoteToBucket(@PathVariable("subNoteId") Long subNoteId,
                                                    @RequestParam("bucketId") Long bucketId) {
        Map<String, Object> response = new HashMap<>();
        try {
            noteService.updateSubNoteBucket(subNoteId, bucketId);
            response.put("success", true);
            response.put("message", "Sub-note moved to new bucket successfully");
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Failed to move sub-note: " + e.getMessage());
        }
        return response;
    }
    
    @PostMapping("/{noteId}/move-bucket")
    @ResponseBody
    public Map<String, Object> moveNoteToBucket(@PathVariable("noteId") Long noteId,
                                                 @RequestParam("bucketId") Long bucketId) {
        Map<String, Object> response = new HashMap<>();
        try {
            noteService.updateNoteBucket(noteId, bucketId);
            response.put("success", true);
            response.put("message", "Note moved to new bucket successfully");
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Failed to move note: " + e.getMessage());
        }
        return response;
    }
    
    @GetMapping("/{id}/duplicate")
    public String duplicateNote(@PathVariable("id") Long id, RedirectAttributes redirectAttributes) {
        try {
            Note duplicateNote = noteService.duplicateNote(id);
            if (duplicateNote != null) {
                redirectAttributes.addFlashAttribute("success", "Note duplicated successfully");
                return "redirect:/notes/" + duplicateNote.getId();
            } else {
                redirectAttributes.addFlashAttribute("error", "Failed to duplicate note");
                return "redirect:/notes";
            }
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error", "Failed to duplicate note: " + e.getMessage());
            return "redirect:/notes";
        }
    }

}
