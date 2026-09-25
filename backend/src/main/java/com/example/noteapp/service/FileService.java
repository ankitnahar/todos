package com.example.noteapp.service;

import com.example.noteapp.model.FileAttachment;
import com.example.noteapp.repository.FileAttachmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FileService {

    private final FileAttachmentRepository fileAttachmentRepository;
    private final Path uploadPath = Paths.get("./data/uploads");

    @Transactional
    public FileAttachment uploadFile(MultipartFile file, Long noteId, Long subNoteId) throws IOException {
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        String originalFileName = file.getOriginalFilename();
        String storedFileName = UUID.randomUUID().toString() + "_" + originalFileName;
        Path targetPath = uploadPath.resolve(storedFileName);

        Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

        FileAttachment fileAttachment = FileAttachment.builder()
                .originalFileName(originalFileName)
                .storedFileName(storedFileName)
                .contentType(file.getContentType())
                .fileSize(file.getSize())
                .noteId(noteId)
                .subNoteId(subNoteId)
                .build();

        return fileAttachmentRepository.save(fileAttachment);
    }

    @Transactional(readOnly = true)
    public Resource downloadFile(Long fileId) throws IOException {
        FileAttachment fileAttachment = fileAttachmentRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found with id: " + fileId));

        Path filePath = uploadPath.resolve(fileAttachment.getStoredFileName());
        Resource resource = new UrlResource(filePath.toUri());

        if (!resource.exists() || !resource.isReadable()) {
            throw new RuntimeException("File not found or not readable: " + fileAttachment.getStoredFileName());
        }

        return resource;
    }

    @Transactional(readOnly = true)
    public FileAttachment getFileAttachment(Long fileId) {
        return fileAttachmentRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found with id: " + fileId));
    }

    @Transactional(readOnly = true)
    public List<FileAttachment> getFilesByNoteId(Long noteId) {
        return fileAttachmentRepository.findByNoteId(noteId);
    }

    @Transactional(readOnly = true)
    public List<FileAttachment> getFilesBySubNoteId(Long subNoteId) {
        return fileAttachmentRepository.findBySubNoteId(subNoteId);
    }

    @Transactional
    public void deleteFile(Long fileId) throws IOException {
        FileAttachment fileAttachment = fileAttachmentRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found with id: " + fileId));

        Path filePath = uploadPath.resolve(fileAttachment.getStoredFileName());
        Files.deleteIfExists(filePath);

        fileAttachmentRepository.deleteById(fileId);
    }
}
