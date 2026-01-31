package com.example.todoapp.repository;

import com.example.todoapp.model.Bucket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BucketRepository extends JpaRepository<Bucket, Long> {
    List<Bucket> findAllByOrderByPriorityAsc();
    Optional<Bucket> findByName(String name);
}
