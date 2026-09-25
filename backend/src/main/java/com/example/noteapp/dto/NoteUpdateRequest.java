package com.example.noteapp.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NoteUpdateRequest {

    private String name;
    private String details;
    private Boolean favorite;
    private Boolean hotTopic;
    private Boolean nested;
    private Long bucketId;
    private Set<String> tagNames;
    private Set<Long> teamMemberIds;
}
