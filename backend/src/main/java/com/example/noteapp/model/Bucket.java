package com.example.noteapp.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "buckets")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Bucket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(name = "priority")
    private Integer priority;

    @Column(name = "color")
    private String color;

    @Column(name = "is_default")
    @Builder.Default
    private Boolean isDefault = false;
}
