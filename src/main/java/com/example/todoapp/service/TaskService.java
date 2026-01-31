package com.example.todoapp.service;

import com.example.todoapp.model.Tag;
import com.example.todoapp.model.Task;
import com.example.todoapp.model.Task.Status;
import com.example.todoapp.repository.TaskRepository;

import jakarta.persistence.criteria.*;

import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
public class TaskService {

    private final TaskRepository taskRepository;

    public TaskService(TaskRepository taskRepository){
        this.taskRepository = taskRepository;
    }

    public Task save(Task task){
        return taskRepository.save(task);
    }

    public Optional<Task> findById(Long id){
        return taskRepository.findById(id);
    }

    public void deleteById(Long id){
        taskRepository.deleteById(id);
    }

    /**
     * Find tasks with specified filters.
     * For quick filters (today, week, month), includes tasks from the current period plus past due tasks.
     */
    public List<Task> findTasksFiltered(LocalDate startDate, LocalDate endDate, Task.Status status,
                                        String searchText, Set<Long> tagIds, Boolean showHiddenTasks, String quickFilter) {

        // Get ALL tasks from the repository - we'll filter them in memory
        List<Task> allTasks = taskRepository.findAll();
        LocalDate today = LocalDate.now();

        // Start with an empty result set
        List<Task> result = new ArrayList<>();

        // First, apply date filtering based on quickFilter or specific dates
        for (Task task : allTasks) {
            boolean includeTask = false;

            // Apply quick filter date logic if specified, otherwise use startDate/endDate
            if (quickFilter != null && !quickFilter.isEmpty() && !"all".equals(quickFilter)) {
                LocalDate periodStart = null;
                LocalDate periodEnd = null;

                if ("today".equals(quickFilter)) {
                    periodStart = today;
                    periodEnd = today;
                } else if ("week".equals(quickFilter)) {
                    periodStart = today.with(java.time.DayOfWeek.MONDAY);
                    periodEnd = today.with(java.time.DayOfWeek.SUNDAY);
                } else if ("month".equals(quickFilter)) {
                    periodStart = today.withDayOfMonth(1);
                    periodEnd = today.withDayOfMonth(today.lengthOfMonth());
                }

                if (periodStart != null && task.getDate() != null) {
                    // Include if task is within current period (today/week/month)
                    if ((task.getDate().isEqual(periodStart) || task.getDate().isAfter(periodStart)) &&
                        (task.getDate().isEqual(periodEnd) || task.getDate().isBefore(periodEnd))) {
                        includeTask = true;
                    }
                    // Include if task is past due and not DONE
                    else if (task.getDate().isBefore(periodStart) && task.getStatus() != Status.DONE) {
                        includeTask = true;
                    }
                }
            } else if ("all".equals(quickFilter)) {
                // Include all tasks for "all" filter
                includeTask = true;
            } else if (startDate != null || endDate != null) {
                // Apply explicit date filters if provided
                if (startDate != null && endDate != null) {
                    // Both start and end date provided
                    if (task.getDate() != null &&
                        (task.getDate().isEqual(startDate) || task.getDate().isAfter(startDate)) &&
                        (task.getDate().isEqual(endDate) || task.getDate().isBefore(endDate))) {
                        includeTask = true;
                    }
                } else if (startDate != null) {
                    // Only start date provided
                    if (task.getDate() != null &&
                        (task.getDate().isEqual(startDate) || task.getDate().isAfter(startDate))) {
                        includeTask = true;
                    }
                } else if (endDate != null) {
                    // Only end date provided
                    if (task.getDate() != null &&
                        (task.getDate().isEqual(endDate) || task.getDate().isBefore(endDate))) {
                        includeTask = true;
                    }
                }
            } else {
                // No date filters at all - include everything
                includeTask = true;
            }

            // If task passes date filtering, add it to initial result set
            if (includeTask) {
                result.add(task);
            }
        }

        // Apply additional filters to the date-filtered result set

        // Filter by status if specified
        if (status != null) {
            result = result.stream()
                .filter(task -> task.getStatus() == status)
                .collect(Collectors.toList());
        }

        // Filter by search text if specified
        if (searchText != null && !searchText.isBlank()) {
            String searchLower = searchText.toLowerCase();
            result = result.stream()
                .filter(task ->
                    (task.getName() != null && task.getName().toLowerCase().contains(searchLower)) ||
                    (task.getDetails() != null && task.getDetails().toLowerCase().contains(searchLower)))
                .collect(Collectors.toList());
        }

        // Filter by tags if specified
        if (tagIds != null && !tagIds.isEmpty()) {
            result = result.stream()
                .filter(task -> {
                    for (Tag tag : task.getTags()) {
                        if (tagIds.contains(tag.getId())) {
                            return true;
                        }
                    }
                    return false;
                })
                .collect(Collectors.toList());
        }

        // Filter hidden tasks if required
        if (showHiddenTasks == null || !showHiddenTasks) {
            // Always show hidden items when there's a search query
            if (searchText == null || searchText.isBlank()) {
                result = result.stream()
                    .filter(task -> task.getHiddenForToday() == null || !task.getHiddenForToday())
                    .collect(Collectors.toList());
            }
        }

        return result;
    }

    public List<Task> findAll(){
        return taskRepository.findAll();
    }

    public void deleteAllByIds(List<Long> ids){
        taskRepository.deleteAllById(ids);
    }

    @Transactional
    public void moveTasksToDate(List<Long> taskIds, LocalDate newDate){
        List<Task> tasks = taskRepository.findAllById(taskIds);
        for(Task task : tasks){
            task.setDate(newDate);
        }
        taskRepository.saveAll(tasks);
    }

    @Transactional
    public void copyTasksToDate(List<Long> taskIds, LocalDate newDate){
        List<Task> tasks = taskRepository.findAllById(taskIds);
        List<Task> copies = new ArrayList<>();
        for(Task task : tasks){
            Task copy = new Task();
            copy.setName(task.getName());
            copy.setDetails(task.getDetails());
            copy.setDate(newDate);
            copy.setStatus(task.getStatus());
            copy.setTags(new HashSet<>(task.getTags()));
            copies.add(copy);
        }
        taskRepository.saveAll(copies);
    }
}
