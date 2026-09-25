package com.example.noteapp.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StatsDTO {

    private Long totalNotes;
    private Long favoriteNotes;
    private Long hotTopicNotes;
    private Long hotTopicSubNotes;
    private Long deletedNotes;
    private Map<Long, Long> notesByBucket;
    private Map<Long, Long> notesByTag;
}
