package com.example.noteapp.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BucketViewDTO {

    private Long bucketId;
    private String bucketName;
    private String bucketColor;
    private Integer bucketPriority;
    private List<NoteDTO> notes;
    private List<SubNoteDTO> subNotes;
}
