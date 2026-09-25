package com.example.noteapp.repository;

import com.example.noteapp.model.SubNote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Set;

@Repository
public interface SubNoteRepository extends JpaRepository<SubNote, Long> {

    @Query("SELECT DISTINCT s FROM SubNote s LEFT JOIN FETCH s.tags LEFT JOIN FETCH s.teamMembers " +
           "WHERE s.bucketId = :bucketId ORDER BY s.displayOrder ASC, s.updatedAt DESC")
    List<SubNote> findAllByBucketId(@Param("bucketId") Long bucketId);

    @Query("SELECT DISTINCT s FROM SubNote s LEFT JOIN FETCH s.tags LEFT JOIN FETCH s.teamMembers " +
           "WHERE LOWER(s.header) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
           "OR LOWER(s.description) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
           "ORDER BY s.updatedAt DESC")
    List<SubNote> searchSubNotes(@Param("searchTerm") String searchTerm);

    @Query("SELECT DISTINCT s FROM SubNote s JOIN s.tags t LEFT JOIN FETCH s.tags LEFT JOIN FETCH s.teamMembers " +
           "WHERE t.id = :tagId ORDER BY s.updatedAt DESC")
    List<SubNote> findByTagId(@Param("tagId") Long tagId);

    @Query("SELECT DISTINCT s FROM SubNote s LEFT JOIN FETCH s.tags LEFT JOIN FETCH s.teamMembers " +
           "WHERE s.hotTopic = true ORDER BY s.updatedAt DESC")
    List<SubNote> findHotTopicSubNotes();

    @Query("SELECT DISTINCT s FROM SubNote s JOIN s.tags t " +
           "WHERE t.id IN :tagIds " +
           "GROUP BY s.id HAVING COUNT(DISTINCT t.id) = :count " +
           "ORDER BY s.updatedAt DESC")
    List<SubNote> findByAllTagIds(@Param("tagIds") Set<Long> tagIds, @Param("count") long count);
}
