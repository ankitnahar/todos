package com.example.noteapp.repository;

import com.example.noteapp.model.Note;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@Repository
public interface NoteRepository extends JpaRepository<Note, Long> {

    @Query("SELECT DISTINCT n FROM Note n LEFT JOIN FETCH n.tags LEFT JOIN FETCH n.teamMembers " +
           "WHERE n.deleted = false ORDER BY n.favorite DESC, n.updatedAt DESC")
    List<Note> findAllSorted();

    @Query("SELECT DISTINCT n FROM Note n LEFT JOIN FETCH n.tags LEFT JOIN FETCH n.teamMembers " +
           "WHERE n.id = :id")
    Optional<Note> findByIdWithSubNotes(@Param("id") Long id);

    @Query("SELECT DISTINCT n FROM Note n LEFT JOIN FETCH n.tags LEFT JOIN FETCH n.teamMembers LEFT JOIN n.subNotes sn " +
           "WHERE n.deleted = false AND (LOWER(n.name) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
           "OR LOWER(n.details) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
           "OR LOWER(sn.header) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
           "OR LOWER(sn.description) LIKE LOWER(CONCAT('%', :searchTerm, '%'))) " +
           "ORDER BY n.favorite DESC, n.updatedAt DESC")
    List<Note> searchNotes(@Param("searchTerm") String searchTerm);

    @Query("SELECT DISTINCT n FROM Note n JOIN n.tags t LEFT JOIN FETCH n.tags LEFT JOIN FETCH n.teamMembers " +
           "WHERE t.id = :tagId AND n.deleted = false ORDER BY n.favorite DESC, n.updatedAt DESC")
    List<Note> findByTagId(@Param("tagId") Long tagId);

    @Query("SELECT DISTINCT n FROM Note n LEFT JOIN FETCH n.tags LEFT JOIN FETCH n.teamMembers " +
           "WHERE n.bucketId = :bucketId AND n.deleted = false ORDER BY n.favorite DESC, n.updatedAt DESC")
    List<Note> findByBucketId(@Param("bucketId") Long bucketId);

    @Query("SELECT DISTINCT n FROM Note n LEFT JOIN FETCH n.tags LEFT JOIN FETCH n.teamMembers " +
           "WHERE n.deleted = true ORDER BY n.deletedAt DESC")
    List<Note> findAllDeleted();

    @Query("SELECT DISTINCT n FROM Note n LEFT JOIN FETCH n.tags LEFT JOIN FETCH n.teamMembers " +
           "WHERE n.hotTopic = true AND n.deleted = false ORDER BY n.updatedAt DESC")
    List<Note> findHotTopicNotes();

    @Query("SELECT DISTINCT n FROM Note n JOIN n.tags t " +
           "WHERE t.id IN :tagIds AND n.deleted = false " +
           "GROUP BY n.id HAVING COUNT(DISTINCT t.id) = :count " +
           "ORDER BY n.favorite DESC, n.updatedAt DESC")
    List<Note> findByAllTagIds(@Param("tagIds") Set<Long> tagIds, @Param("count") long count);
}
