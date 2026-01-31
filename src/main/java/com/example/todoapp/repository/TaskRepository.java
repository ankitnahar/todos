package com.example.todoapp.repository;

import com.example.todoapp.model.Task;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface TaskRepository extends JpaRepository<Task, Long>, JpaSpecificationExecutor<Task> {
    // JpaSpecificationExecutor allows dynamic filtering via Specification in services
}
