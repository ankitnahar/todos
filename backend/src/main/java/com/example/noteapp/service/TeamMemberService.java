package com.example.noteapp.service;

import com.example.noteapp.model.TeamMember;
import com.example.noteapp.repository.TeamMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class TeamMemberService {

    private final TeamMemberRepository teamMemberRepository;

    @Transactional(readOnly = true)
    public List<TeamMember> getAllTeamMembers() {
        return teamMemberRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Optional<TeamMember> getTeamMemberById(Long id) {
        return teamMemberRepository.findById(id);
    }

    @Transactional
    public TeamMember createTeamMember(TeamMember teamMember) {
        return teamMemberRepository.save(teamMember);
    }

    @Transactional
    public TeamMember updateTeamMember(Long id, TeamMember teamMemberDetails) {
        TeamMember teamMember = teamMemberRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("TeamMember not found with id: " + id));

        if (teamMemberDetails.getName() != null) {
            teamMember.setName(teamMemberDetails.getName());
        }

        return teamMemberRepository.save(teamMember);
    }

    @Transactional
    public void deleteTeamMember(Long id) {
        teamMemberRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<TeamMember> findAllByIds(List<Long> ids) {
        return teamMemberRepository.findAllById(ids);
    }
}
