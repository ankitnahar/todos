package com.example.todoapp.service;

import com.example.todoapp.model.Tag;
import com.example.todoapp.repository.TagRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
@Transactional
public class TagService {
    private final TagRepository tagRepository;

    public TagService(TagRepository tagRepository){
        this.tagRepository = tagRepository;
    }

    public List<Tag> findAll(){
        return tagRepository.findAll();
    }

    public Tag save(Tag tag){
        return tagRepository.save(tag);
    }

    public Optional<Tag> findById(Long id){
        return tagRepository.findById(id);
    }

    public void deleteById(Long id){
        tagRepository.deleteById(id);
    }

    public Optional<Tag> findByName(String name){
        return tagRepository.findByName(name);
    }

    public List<Tag> findAllByIds(List<Long> ids) {
        return tagRepository.findAllById(ids);
    }

    public Set<Tag> findOrCreateTags(Set<String> tagNames) {
        Set<Tag> tags = new HashSet<>();
        for (String tagName : tagNames) {
            Optional<Tag> existingTag = findByName(tagName.trim());
            if (existingTag.isPresent()) {
                tags.add(existingTag.get());
            } else {
                Tag newTag = new Tag(tagName.trim());
                tags.add(save(newTag));
            }
        }
        return tags;
    }

}
