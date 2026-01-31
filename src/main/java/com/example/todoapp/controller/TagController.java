package com.example.todoapp.controller;

import com.example.todoapp.model.Tag;
import com.example.todoapp.service.TagService;

import jakarta.validation.Valid;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Controller
@RequestMapping("/tags")
public class TagController {

    private final TagService tagService;

    public TagController(TagService tagService){
        this.tagService = tagService;
    }

    @GetMapping({"", "/"})
    public String listTags(Model model){
        List<Tag> tags = tagService.findAll();
        model.addAttribute("tags", tags);
        return "tag-list";
    }

    @GetMapping("/new")
    public String addTagForm(Model model){
        model.addAttribute("tag", new Tag());
        return "add-tag";
    }

    @PostMapping("/new")
    public String addTagSubmit(@Valid @ModelAttribute Tag tag, BindingResult bindingResult){
        if(bindingResult.hasErrors()){
            return "add-tag";
        }
        tagService.save(tag);
        return "redirect:/tags";
    }

    @PostMapping("/{id}/delete")
    public String deleteTag(@PathVariable Long id){
        tagService.deleteById(id);
        return "redirect:/tags";
    }
}
