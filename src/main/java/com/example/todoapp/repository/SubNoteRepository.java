package com.example.todoapp.repository;

import com.example.todoapp.model.SubNote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SubNoteRepository extends JpaRepository<SubNote, Long> {
    List<SubNote> findByBucketIdOrderByDisplayOrder(Long bucketId);
    
    @Query("SELECT s FROM SubNote s WHERE s.bucketId = :bucketId ORDER BY s.displayOrder")
    List<SubNote> findAllByBucketId(Long bucketId);
}
