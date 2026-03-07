package com.example.todoapp.repository;

import com.example.todoapp.model.Note;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Set;

@Repository
public interface NoteRepository extends JpaRepository<Note, Long> {

    @Query("SELECT n FROM Note n WHERE n.deleted = false ORDER BY n.favorite DESC, n.updatedAt DESC")
    List<Note> findAllSorted();

    @Query("SELECT DISTINCT n FROM Note n LEFT JOIN n.tags t LEFT JOIN n.subNotes s WHERE " +
           "n.deleted = false AND (" +
           "LOWER(n.name) LIKE LOWER(CONCAT('%', :searchText, '%')) OR " +
           "LOWER(n.details) LIKE LOWER(CONCAT('%', :searchText, '%')) OR " +
           "LOWER(t.name) LIKE LOWER(CONCAT('%', :searchText, '%')) OR " +
           "LOWER(s.header) LIKE LOWER(CONCAT('%', :searchText, '%')) OR " +
           "LOWER(s.description) LIKE LOWER(CONCAT('%', :searchText, '%'))) " +
           "ORDER BY n.favorite DESC, n.updatedAt DESC")
    List<Note> searchNotes(@Param("searchText") String searchText);

    @Query("SELECT DISTINCT n FROM Note n LEFT JOIN FETCH n.subNotes JOIN n.tags t WHERE n.deleted = false AND t.id = :tagId ORDER BY n.favorite DESC, n.updatedAt DESC")
    List<Note> findByTagId(@Param("tagId") Long tagId);

    @Query("SELECT DISTINCT n FROM Note n LEFT JOIN FETCH n.subNotes JOIN n.tags t WHERE n.deleted = false AND t.id IN :tagIds ORDER BY n.favorite DESC, n.updatedAt DESC")
    List<Note> findByAnyTagIds(@Param("tagIds") Set<Long> tagIds);

    @Query("SELECT DISTINCT n FROM Note n LEFT JOIN FETCH n.subNotes WHERE n.deleted = false AND " +
           "(SELECT COUNT(DISTINCT t.id) FROM Note n2 JOIN n2.tags t WHERE n2 = n AND t.id IN :tagIds) = :tagCount " +
           "ORDER BY n.favorite DESC, n.updatedAt DESC")
    List<Note> findByAllTagIds(@Param("tagIds") Set<Long> tagIds, @Param("tagCount") long tagCount);

    @Query("SELECT DISTINCT n FROM Note n JOIN n.tags t WHERE n.deleted = false AND t.name = :tagName ORDER BY n.favorite DESC, n.updatedAt DESC")
    List<Note> findByTagName(@Param("tagName") String tagName);
    
    @Query("SELECT n FROM Note n WHERE n.deleted = false AND n.bucketId = :bucketId ORDER BY n.favorite DESC, n.updatedAt DESC")
    List<Note> findByBucketId(@Param("bucketId") Long bucketId);

    @Query("SELECT n FROM Note n WHERE n.deleted = true ORDER BY n.deletedAt DESC")
    List<Note> findAllDeleted();

    @Query("SELECT DISTINCT n FROM Note n " +
            "LEFT JOIN FETCH n.subNotes s " +
            "LEFT JOIN FETCH s.tags " +
            "LEFT JOIN FETCH s.teamMembers " +
            "WHERE n.id = :id")
    Note findByIdWithSubNotes(@Param("id") Long id);

    @Query("SELECT DISTINCT n FROM Note n LEFT JOIN FETCH n.subNotes JOIN n.teamMembers tm WHERE n.deleted = false AND tm.id IN :teamMemberIds ORDER BY n.favorite DESC, n.updatedAt DESC")
    List<Note> findByAnyTeamMemberIds(@Param("teamMemberIds") Set<Long> teamMemberIds);

    @Query("SELECT DISTINCT n FROM Note n LEFT JOIN FETCH n.subNotes WHERE n.deleted = false AND SIZE(n.teamMembers) = 0 ORDER BY n.favorite DESC, n.updatedAt DESC")
    List<Note> findUnassignedNotes();

    @Query("SELECT DISTINCT n FROM Note n LEFT JOIN FETCH n.subNotes WHERE n.deleted = false AND n.bucketId = :bucketId AND SIZE(n.teamMembers) = 0 ORDER BY n.favorite DESC, n.updatedAt DESC")
    List<Note> findUnassignedNotesByBucketId(@Param("bucketId") Long bucketId);
}
