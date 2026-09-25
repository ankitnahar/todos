package com.example.noteapp.repository;

import com.example.noteapp.model.FileAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FileAttachmentRepository extends JpaRepository<FileAttachment, Long> {

    List<FileAttachment> findByNoteId(Long noteId);

    List<FileAttachment> findBySubNoteId(Long subNoteId);
}
