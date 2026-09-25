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
public class SubNoteCreateRequest {

    @NotBlank(message = "SubNote header is required")
    private String header;

    private String description;
    private Long linkedNoteId;
    private Long bucketId;
    private Integer displayOrder;
    private Boolean hotTopic;
    private Set<String> tagNames;
    private Set<Long> teamMemberIds;
}
