package com.example.noteapp.controller;

import com.example.noteapp.model.TeamMember;
import com.example.noteapp.service.TeamMemberService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/team-members")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class TeamMemberController {

    private final TeamMemberService teamMemberService;

    @GetMapping
    public ResponseEntity<List<TeamMember>> getAllTeamMembers() {
        return ResponseEntity.ok(teamMemberService.getAllTeamMembers());
    }

    @GetMapping("/{id}")
    public ResponseEntity<TeamMember> getTeamMemberById(@PathVariable Long id) {
        return teamMemberService.getTeamMemberById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<TeamMember> createTeamMember(@RequestBody TeamMember teamMember) {
        return ResponseEntity.ok(teamMemberService.createTeamMember(teamMember));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TeamMember> updateTeamMember(@PathVariable Long id, @RequestBody TeamMember teamMember) {
        return ResponseEntity.ok(teamMemberService.updateTeamMember(id, teamMember));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTeamMember(@PathVariable Long id) {
        teamMemberService.deleteTeamMember(id);
        return ResponseEntity.noContent().build();
    }
}
