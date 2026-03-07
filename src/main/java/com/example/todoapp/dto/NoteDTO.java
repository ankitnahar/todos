package com.example.todoapp.dto;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Setter
@Getter
public class NoteDTO {
    // Getters and Setters
    private Long id;
    private String name;
    private String details;
    private Boolean nested;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Boolean favorite;
    private Boolean deleted;
    private List<SubNoteDTO> subNotes = new ArrayList<>();
    private Set<TeamMemberDTO> teamMembers = new HashSet<>();

    public NoteDTO() {
    }

    public NoteDTO(Long id, String name, String details, Boolean nested, LocalDateTime createdAt, LocalDateTime updatedAt, Boolean favorite, Boolean deleted) {
        this.id = id;
        this.name = name;
        this.details = details;
        this.nested = nested;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.favorite = favorite;
        this.deleted = deleted;
    }

    public void addSubNote(SubNoteDTO subNote) {
        this.subNotes.add(subNote);
    }
}
