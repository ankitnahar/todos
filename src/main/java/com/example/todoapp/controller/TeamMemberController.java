package com.example.todoapp.controller;

import com.example.todoapp.model.TeamMember;
import com.example.todoapp.service.TeamMemberService;

import jakarta.validation.Valid;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Controller
@RequestMapping("/team-members")
public class TeamMemberController {

    private final TeamMemberService teamMemberService;

    public TeamMemberController(TeamMemberService teamMemberService) {
        this.teamMemberService = teamMemberService;
    }

    @GetMapping({"", "/"})
    public String listTeamMembers(Model model) {
        List<TeamMember> teamMembers = teamMemberService.findAll();
        model.addAttribute("teamMembers", teamMembers);
        return "team-member-list";
    }

    @GetMapping("/new")
    public String addTeamMemberForm(Model model) {
        model.addAttribute("teamMember", new TeamMember());
        return "add-team-member";
    }

    @PostMapping("/new")
    public String addTeamMemberSubmit(@Valid @ModelAttribute TeamMember teamMember, BindingResult bindingResult) {
        if (bindingResult.hasErrors()) {
            return "add-team-member";
        }
        teamMemberService.save(teamMember);
        return "redirect:/team-members";
    }

    @PostMapping("/{id}/delete")
    public String deleteTeamMember(@PathVariable Long id) {
        teamMemberService.deleteById(id);
        return "redirect:/team-members";
    }
}
