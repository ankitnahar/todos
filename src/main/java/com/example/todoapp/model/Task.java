package com.example.todoapp.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "tasks")
public class Task {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Name is mandatory")
    private String name;

    @Column(columnDefinition = "TEXT")
    private String details;

    private LocalDate date;

    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    private Status status;

    private Boolean important;

    private Boolean hiddenForToday;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "task_tags",
            joinColumns = @JoinColumn(name = "task_id"),
            inverseJoinColumns = @JoinColumn(name = "tag_id"))
    private Set<Tag> tags = new HashSet<>();

    // Constructors, Getters, Setters

    public Task() {
        this.date = LocalDate.now();
        this.status = Status.TODO;
        this.endDate = null;
        this.important = false;
        this.hiddenForToday = false;
    }

    // Getters and setters here (or use Lombok if you prefer)

    public enum Status {
        TODO,
        IN_PROGRESS,
        DONE,
        BLOCKED
    }

    // Getters and setters below ...
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDetails() { return details; }
    public void setDetails(String details) { this.details = details; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }

    public Set<Tag> getTags() { return tags; }
    public void setTags(Set<Tag> tags) { this.tags = tags; }

    public LocalDate getEndDate() {
        return endDate;
    }

    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }

    public Boolean getImportant() {
        return important;
    }

    public void setImportant(Boolean important) {
        this.important = important;
    }

    public Boolean getHiddenForToday() {
        return hiddenForToday;
    }

    public void setHiddenForToday(Boolean hiddenForToday) {
        this.hiddenForToday = hiddenForToday;
    }
}
