package com.example.todoapp.dto;

import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class TeamMemberDTO {
    private Long id;
    private String name;

    public TeamMemberDTO() {}

    public TeamMemberDTO(Long id, String name) {
        this.id = id;
        this.name = name;
    }
}
