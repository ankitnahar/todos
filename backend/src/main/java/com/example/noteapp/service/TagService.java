package com.example.noteapp.service;

import com.example.noteapp.model.Tag;
import com.example.noteapp.repository.TagRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class TagService {

    private final TagRepository tagRepository;

    @Transactional(readOnly = true)
    public List<Tag> getAllTags() {
        return tagRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Optional<Tag> getTagById(Long id) {
        return tagRepository.findById(id);
    }

    @Transactional
    public Tag createTag(Tag tag) {
        return tagRepository.save(tag);
    }

    @Transactional
    public Tag updateTag(Long id, Tag tagDetails) {
        Tag tag = tagRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tag not found with id: " + id));

        if (tagDetails.getName() != null) {
            tag.setName(tagDetails.getName());
        }

        return tagRepository.save(tag);
    }

    @Transactional
    public void deleteTag(Long id) {
        tagRepository.deleteById(id);
    }

    @Transactional
    public Set<Tag> findOrCreateTags(Set<String> tagNames) {
        Set<Tag> tags = new HashSet<>();
        if (tagNames != null) {
            for (String name : tagNames) {
                Tag tag = tagRepository.findByName(name)
                        .orElseGet(() -> tagRepository.save(Tag.builder().name(name).build()));
                tags.add(tag);
            }
        }
        return tags;
    }

    @Transactional(readOnly = true)
    public List<Tag> findAllByIds(List<Long> ids) {
        return tagRepository.findAllById(ids);
    }
}
