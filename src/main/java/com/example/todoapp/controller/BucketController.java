package com.example.todoapp.controller;

import com.example.todoapp.model.Bucket;
import com.example.todoapp.model.SubNote;
import com.example.todoapp.model.Note;
import com.example.todoapp.service.BucketService;
import com.example.todoapp.service.NoteService;
import com.example.todoapp.service.TeamMemberService;
import com.example.todoapp.repository.SubNoteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;

@Controller
@RequestMapping("/buckets")
public class BucketController {

    private final BucketService bucketService;
    private final SubNoteRepository subNoteRepository;
    private final NoteService noteService;
    private final TeamMemberService teamMemberService;

    @Autowired
    public BucketController(BucketService bucketService, SubNoteRepository subNoteRepository, NoteService noteService, TeamMemberService teamMemberService) {
        this.bucketService = bucketService;
        this.subNoteRepository = subNoteRepository;
        this.noteService = noteService;
        this.teamMemberService = teamMemberService;
    }

    @GetMapping
    public String listBuckets(Model model) {
        List<Bucket> buckets = bucketService.getAllBuckets();
        model.addAttribute("buckets", buckets);
        return "bucket-list";
    }
    
    @GetMapping("/view")
    public String consolidatedView(@RequestParam(required = false, defaultValue = "false") Boolean groupByNote, Model model) {
        List<Bucket> buckets = bucketService.getAllBuckets();
        
        // For each bucket, get all subnotes and their parent notes (excluding deleted notes)
        Map<Long, List<SubNote>> bucketSubNotes = new HashMap<>();
        Map<Long, Note> parentNotes = new HashMap<>();
        Map<Long, Map<Long, List<SubNote>>> bucketNoteSubNotes = new HashMap<>(); // bucket -> note -> subnotes
        Map<Long, List<Note>> bucketNotes = new HashMap<>(); // bucket -> notes (no sub-notes)
        
        for (Bucket bucket : buckets) {
            List<SubNote> subNotes = subNoteRepository.findAllByBucketId(bucket.getId());
            
            // Filter out subnotes from deleted notes
            List<SubNote> activeSubNotes = subNotes.stream()
                .filter(sn -> sn.getNote() != null && (sn.getNote().getDeleted() == null || !sn.getNote().getDeleted()))
                .collect(Collectors.toList());
            
            bucketSubNotes.put(bucket.getId(), activeSubNotes);
            
            // Group subnotes by parent note for grouped view
            Map<Long, List<SubNote>> noteSubNotesMap = new HashMap<>();

            // Get notes with this bucket - but for nested notes (parents with subnotes),
            // the bucket on parent is meaningless, so only include non-nested notes
            List<Note> notesInBucket = noteService.findByBucketId(bucket.getId());
            List<Note> noteOnly = new java.util.ArrayList<>();
            for (Note note : notesInBucket) {
                if (note != null && (note.getDeleted() == null || !note.getDeleted())) {
                    // Only include note if it's NOT nested (no subnotes)
                    // For nested notes, bucket on parent is meaningless - only subnote buckets matter
                    if (!note.isNested()) {
                        parentNotes.putIfAbsent(note.getId(), note);
                        noteSubNotesMap.putIfAbsent(note.getId(), new java.util.ArrayList<>());
                        noteOnly.add(note);
                    }
                }
            }
            bucketNotes.put(bucket.getId(), noteOnly);
            
            // Get parent notes for each subnote
            for (SubNote subNote : activeSubNotes) {
                if (subNote.getNote() != null) {
                    Long noteId = subNote.getNote().getId();
                    if (!parentNotes.containsKey(noteId)) {
                        parentNotes.put(noteId, subNote.getNote());
                    }
                    
                    // Group by note
                    noteSubNotesMap.computeIfAbsent(noteId, k -> new java.util.ArrayList<>()).add(subNote);
                }
            }
            
            bucketNoteSubNotes.put(bucket.getId(), noteSubNotesMap);
        }
        
        model.addAttribute("buckets", buckets);
        model.addAttribute("bucketSubNotes", bucketSubNotes);
        model.addAttribute("bucketNoteSubNotes", bucketNoteSubNotes);
        model.addAttribute("bucketNotes", bucketNotes);
        model.addAttribute("parentNotes", parentNotes);
        model.addAttribute("groupByNote", groupByNote);
        
        // Add team members for filtering
        model.addAttribute("allTeamMembers", teamMemberService.findAll());
        
        return "bucket-consolidated-view";
    }

    @GetMapping("/add")
    public String showAddForm(Model model) {
        model.addAttribute("bucket", new Bucket());
        return "add-bucket";
    }

    @PostMapping("/add")
    public String addBucket(@ModelAttribute Bucket bucket, RedirectAttributes redirectAttributes) {
        try {
            // Ensure only one default bucket
            if (bucket.getIsDefault()) {
                // Set all other buckets to non-default
                List<Bucket> allBuckets = bucketService.getAllBuckets();
                allBuckets.forEach(b -> {
                    if (b.getIsDefault()) {
                        b.setIsDefault(false);
                        bucketService.saveBucket(b);
                    }
                });
            }
            
            bucketService.saveBucket(bucket);
            redirectAttributes.addFlashAttribute("success", "Bucket added successfully");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error", "Failed to add bucket: " + e.getMessage());
        }
        return "redirect:/buckets";
    }

    @GetMapping("/{id}/edit")
    public String showEditForm(@PathVariable Long id, Model model, RedirectAttributes redirectAttributes) {
        Bucket bucket = bucketService.getBucketById(id).orElse(null);
        if (bucket == null) {
            redirectAttributes.addFlashAttribute("error", "Bucket not found");
            return "redirect:/buckets";
        }
        model.addAttribute("bucket", bucket);
        return "edit-bucket";
    }

    @PostMapping("/{id}/edit")
    public String updateBucket(@PathVariable Long id, @ModelAttribute Bucket bucket, RedirectAttributes redirectAttributes) {
        try {
            bucket.setId(id);
            
            // Ensure only one default bucket
            if (bucket.getIsDefault()) {
                List<Bucket> allBuckets = bucketService.getAllBuckets();
                allBuckets.forEach(b -> {
                    if (b.getIsDefault() && !b.getId().equals(id)) {
                        b.setIsDefault(false);
                        bucketService.saveBucket(b);
                    }
                });
            }
            
            bucketService.saveBucket(bucket);
            redirectAttributes.addFlashAttribute("success", "Bucket updated successfully");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error", "Failed to update bucket: " + e.getMessage());
        }
        return "redirect:/buckets";
    }

    @GetMapping("/{id}/delete")
    public String deleteBucket(@PathVariable Long id, RedirectAttributes redirectAttributes) {
        try {
            Bucket bucket = bucketService.getBucketById(id).orElse(null);
            if (bucket == null) {
                redirectAttributes.addFlashAttribute("error", "Bucket not found");
                return "redirect:/buckets";
            }
            
            // Prevent deleting the default bucket
            if (bucket.getIsDefault()) {
                redirectAttributes.addFlashAttribute("error", "Cannot delete the default bucket");
                return "redirect:/buckets";
            }
            
            bucketService.deleteBucket(id);
            redirectAttributes.addFlashAttribute("success", "Bucket deleted successfully");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error", "Failed to delete bucket: " + e.getMessage());
        }
        return "redirect:/buckets";
    }
}
