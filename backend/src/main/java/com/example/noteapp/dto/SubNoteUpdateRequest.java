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
public class SubNoteUpdateRequest {

    private String header;
    private String description;
    private Long linkedNoteId;
    private Long bucketId;
    private Integer displayOrder;
    private Boolean hotTopic;
    private Set<String> tagNames;
    private Set<Long> teamMemberIds;
}
