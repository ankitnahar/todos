package com.example.todoapp.repository;

import com.example.todoapp.model.SubNote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SubNoteRepository extends JpaRepository<SubNote, Long> {
    List<SubNote> findByBucketIdOrderByDisplayOrder(Long bucketId);
    
    @Query("SELECT s FROM SubNote s WHERE s.bucketId = :bucketId ORDER BY s.displayOrder")
    List<SubNote> findAllByBucketId(@Param("bucketId") Long bucketId);
    
    @Query("SELECT DISTINCT s FROM SubNote s LEFT JOIN s.tags t WHERE " +
           "LOWER(s.header) LIKE LOWER(CONCAT('%', :searchText, '%')) OR " +
           "LOWER(s.description) LIKE LOWER(CONCAT('%', :searchText, '%')) OR " +
           "LOWER(t.name) LIKE LOWER(CONCAT('%', :searchText, '%'))")
    List<SubNote> searchSubNotes(@Param("searchText") String searchText);
    
    @Query("SELECT DISTINCT s FROM SubNote s JOIN s.tags t WHERE t.id = :tagId")
    List<SubNote> findByTagId(@Param("tagId") Long tagId);
}
