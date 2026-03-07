package com.example.todoapp.service;

import com.example.todoapp.model.TeamMember;
import com.example.todoapp.repository.TeamMemberRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class TeamMemberService {
    private final TeamMemberRepository teamMemberRepository;

    public TeamMemberService(TeamMemberRepository teamMemberRepository) {
        this.teamMemberRepository = teamMemberRepository;
    }

    public List<TeamMember> findAll() {
        return teamMemberRepository.findAll();
    }

    public TeamMember save(TeamMember teamMember) {
        return teamMemberRepository.save(teamMember);
    }

    public Optional<TeamMember> findById(Long id) {
        return teamMemberRepository.findById(id);
    }

    public void deleteById(Long id) {
        teamMemberRepository.deleteById(id);
    }

    public List<TeamMember> findAllByIds(List<Long> ids) {
        return teamMemberRepository.findAllById(ids);
    }
}
