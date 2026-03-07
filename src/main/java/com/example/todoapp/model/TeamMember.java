package com.example.todoapp.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "team_members", uniqueConstraints = @UniqueConstraint(columnNames = "name"))
public class TeamMember {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Team member name is mandatory")
    private String name;

    @ManyToMany(mappedBy = "teamMembers")
    private Set<Note> notes = new HashSet<>();

    @ManyToMany(mappedBy = "teamMembers")
    private Set<SubNote> subNotes = new HashSet<>();

    public TeamMember() {}

    public TeamMember(String name) {
        this.name = name;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Set<Note> getNotes() {
        return notes;
    }

    public void setNotes(Set<Note> notes) {
        this.notes = notes;
    }

    public Set<SubNote> getSubNotes() {
        return subNotes;
    }

    public void setSubNotes(Set<SubNote> subNotes) {
        this.subNotes = subNotes;
    }
}
