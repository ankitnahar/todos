package com.example.todoapp.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Setter
@Getter
@Entity
@Table(name = "sub_notes")
public class SubNote {
    // Getters and Setters
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Header is mandatory")
    private String header;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "linked_note_id")
    private Long linkedNoteId;

    @Column(name = "bucket_id")
    private Long bucketId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "note_id")
    private Note note;
    
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "sub_note_tags",
            joinColumns = @JoinColumn(name = "sub_note_id"),
            inverseJoinColumns = @JoinColumn(name = "tag_id"))
    private Set<Tag> tags = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "sub_note_team_members",
            joinColumns = @JoinColumn(name = "sub_note_id"),
            inverseJoinColumns = @JoinColumn(name = "team_member_id"))
    private Set<TeamMember> teamMembers = new HashSet<>();

    @Column(name = "display_order")
    private Integer displayOrder;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    private LocalDateTime lastTrackedDate;

    public SubNote() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

}
