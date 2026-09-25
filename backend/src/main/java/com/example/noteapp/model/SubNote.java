package com.example.noteapp.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "sub_notes")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubNote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "SubNote header is required")
    @Column(nullable = false)
    private String header;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "linked_note_id")
    private Long linkedNoteId;

    @Column(name = "bucket_id")
    private Long bucketId;

    @Column(name = "display_order")
    private Integer displayOrder;

    @Column(name = "hot_topic")
    @Builder.Default
    private Boolean hotTopic = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "last_tracked_date")
    private LocalDateTime lastTrackedDate;

    @ManyToMany(mappedBy = "subNotes")
    @Builder.Default
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Set<Note> notes = new HashSet<>();

    @ManyToMany
    @JoinTable(
        name = "sub_note_tags",
        joinColumns = @JoinColumn(name = "sub_note_id"),
        inverseJoinColumns = @JoinColumn(name = "tag_id")
    )
    @Builder.Default
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Set<Tag> tags = new HashSet<>();

    @ManyToMany
    @JoinTable(
        name = "sub_note_team_members",
        joinColumns = @JoinColumn(name = "sub_note_id"),
        inverseJoinColumns = @JoinColumn(name = "team_member_id")
    )
    @Builder.Default
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Set<TeamMember> teamMembers = new HashSet<>();
}
