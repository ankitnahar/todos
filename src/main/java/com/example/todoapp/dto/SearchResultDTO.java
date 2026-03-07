package com.example.todoapp.dto;

import com.example.todoapp.model.Note;
import com.example.todoapp.model.SubNote;
import com.example.todoapp.model.Tag;
import com.example.todoapp.model.TeamMember;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.stream.Collectors;

@Getter
@Setter
public class SearchResultDTO {
    private Long id;
    private String type; // "NOTE" or "SUBNOTE"
    private String name; // note name or subnote header
    private String details; // note details or subnote description
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Boolean favorite;
    private Set<Tag> tags;
    private Set<Long> teamMemberIds;
    private Set<TeamMember> teamMembers;
    private LocalDateTime lastTrackedDate;
    
    // For subnotes - reference to parent note
    private Long parentNoteId;
    private String parentNoteName;
    
    // For subnotes - bucket info
    private Long bucketId;
    
    public static SearchResultDTO fromNote(Note note) {
        SearchResultDTO dto = new SearchResultDTO();
        dto.setId(note.getId());
        dto.setType("NOTE");
        dto.setName(note.getName());
        dto.setDetails(note.getDetails());
        dto.setCreatedAt(note.getCreatedAt());
        dto.setUpdatedAt(note.getUpdatedAt());
        dto.setFavorite(note.isFavorite());
        dto.setTags(note.getTags());
        dto.setTeamMemberIds(note.getTeamMembers().stream().map(TeamMember::getId).collect(Collectors.toSet()));
        dto.setTeamMembers(note.getTeamMembers());
        dto.setLastTrackedDate(note.getLastTrackedDate());
        dto.setBucketId(note.getBucketId());
        return dto;
    }
    
    public static SearchResultDTO fromSubNote(SubNote subNote, Note parentNote) {
        SearchResultDTO dto = new SearchResultDTO();
        dto.setId(subNote.getId());
        dto.setType("SUBNOTE");
        dto.setName(subNote.getHeader());
        dto.setDetails(subNote.getDescription());
        dto.setCreatedAt(subNote.getCreatedAt());
        dto.setUpdatedAt(subNote.getUpdatedAt());
        dto.setTags(subNote.getTags());
        dto.setTeamMemberIds(subNote.getTeamMembers().stream().map(TeamMember::getId).collect(Collectors.toSet()));
        dto.setTeamMembers(subNote.getTeamMembers());
        dto.setParentNoteId(parentNote.getId());
        dto.setParentNoteName(parentNote.getName());
        dto.setBucketId(subNote.getBucketId());
        dto.setFavorite(parentNote.isFavorite()); // inherit from parent
        dto.setLastTrackedDate(subNote.getLastTrackedDate());
        return dto;
    }
}
