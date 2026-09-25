package com.example.noteapp.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubNoteDTO {

    private Long id;
    private String header;
    private String description;
    private Long linkedNoteId;
    private Long bucketId;
    private Integer displayOrder;
    private Boolean hotTopic;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime lastTrackedDate;

    private Long noteId;
    private Set<Long> parentNoteIds;
    private Set<Long> tagIds;
    private Set<Long> teamMemberIds;
}
