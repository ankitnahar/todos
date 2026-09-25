package com.example.noteapp.controller;

import com.example.noteapp.model.FileAttachment;
import com.example.noteapp.service.FileService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class FileController {

    private final FileService fileService;

    @PostMapping("/upload")
    public ResponseEntity<FileAttachment> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) Long noteId,
            @RequestParam(required = false) Long subNoteId) {
        try {
            FileAttachment fileAttachment = fileService.uploadFile(file, noteId, subNoteId);
            return ResponseEntity.ok(fileAttachment);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> downloadFile(@PathVariable Long id) {
        try {
            FileAttachment fileAttachment = fileService.getFileAttachment(id);
            Resource resource = fileService.downloadFile(id);

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(fileAttachment.getContentType()))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileAttachment.getOriginalFileName() + "\"")
                    .body(resource);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<FileAttachment> getFileAttachment(@PathVariable Long id) {
        return ResponseEntity.ok(fileService.getFileAttachment(id));
    }

    @GetMapping("/note/{noteId}")
    public ResponseEntity<List<FileAttachment>> getFilesByNoteId(@PathVariable Long noteId) {
        return ResponseEntity.ok(fileService.getFilesByNoteId(noteId));
    }

    @GetMapping("/subnote/{subNoteId}")
    public ResponseEntity<List<FileAttachment>> getFilesBySubNoteId(@PathVariable Long subNoteId) {
        return ResponseEntity.ok(fileService.getFilesBySubNoteId(subNoteId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFile(@PathVariable Long id) {
        try {
            fileService.deleteFile(id);
            return ResponseEntity.noContent().build();
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
