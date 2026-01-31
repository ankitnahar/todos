package com.example.todoapp.model;

import jakarta.persistence.*;

@Entity
@Table(name = "buckets")
public class Bucket {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, unique = true)
    private String name;
    
    @Column(nullable = false)
    private Integer priority;
    
    @Column
    private String color;
    
    @Column(nullable = false)
    private Boolean isDefault = false;
    
    // Constructors
    public Bucket() {}
    
    public Bucket(String name, Integer priority, String color, Boolean isDefault) {
        this.name = name;
        this.priority = priority;
        this.color = color;
        this.isDefault = isDefault;
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
    
    public Integer getPriority() {
        return priority;
    }
    
    public void setPriority(Integer priority) {
        this.priority = priority;
    }
    
    public String getColor() {
        return color;
    }
    
    public void setColor(String color) {
        this.color = color;
    }
    
    public Boolean getIsDefault() {
        return isDefault;
    }
    
    public void setIsDefault(Boolean isDefault) {
        this.isDefault = isDefault;
    }
}
