package com.example.noteapp.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NoteCreateRequest {

    @NotBlank(message = "Note name is required")
    private String name;

    private String details;
    private Boolean favorite;
    private Boolean hotTopic;
    private Boolean nested;
    private Long bucketId;
    private Set<String> tagNames;
    private Set<Long> teamMemberIds;
    private Set<SubNoteCreateRequest> subNotes;
}
