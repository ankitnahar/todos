package com.example.todoapp.dto;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

public class SubNoteDTO {
    private Long id;
    private String header;
    private String description;
    private Long bucketId;
    private Integer displayOrder;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Set<TeamMemberDTO> teamMembers = new HashSet<>();

    public SubNoteDTO() {
    }

    public SubNoteDTO(Long id, String header, String description, Long bucketId, Integer displayOrder, LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.header = header;
        this.description = description;
        this.bucketId = bucketId;
        this.displayOrder = displayOrder;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getHeader() {
        return header;
    }

    public void setHeader(String header) {
        this.header = header;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Long getBucketId() {
        return bucketId;
    }

    public void setBucketId(Long bucketId) {
        this.bucketId = bucketId;
    }

    public Integer getDisplayOrder() {
        return displayOrder;
    }

    public void setDisplayOrder(Integer displayOrder) {
        this.displayOrder = displayOrder;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Set<TeamMemberDTO> getTeamMembers() {
        return teamMembers;
    }

    public void setTeamMembers(Set<TeamMemberDTO> teamMembers) {
        this.teamMembers = teamMembers;
    }
}
