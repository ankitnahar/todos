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
public class HotTopicItemDTO {

    private String type;
    private Long id;
    private String title;
    private String details;
    private Long noteId;
    private String noteName;
    private Long bucketId;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;

    private Set<Long> tagIds;
    private Set<Long> parentTagIds;
    private Set<Long> teamMemberIds;
}
