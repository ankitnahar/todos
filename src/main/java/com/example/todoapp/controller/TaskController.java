package com.example.todoapp.controller;

import com.example.todoapp.model.Task;
import com.example.todoapp.model.Task.Status;
import com.example.todoapp.model.Tag;
import com.example.todoapp.service.TaskService;
import com.example.todoapp.service.TagService;
import com.example.todoapp.service.ExcelExportService;

import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Controller
@RequestMapping("/tasks")
public class TaskController {

    private final TaskService taskService;
    private final TagService tagService;
    private final ExcelExportService excelExportService;

    public TaskController(TaskService taskService, TagService tagService, ExcelExportService excelExportService){
        this.taskService = taskService;
        this.tagService = tagService;
        this.excelExportService = excelExportService;
    }

    @GetMapping({"", "/"})
    public String listTasks(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Status status,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) List<Long> tagIds,
            @RequestParam(required = false) String quickFilter,
            @RequestParam(required = false, defaultValue = "false") Boolean showHiddenTasks,
            Model model
    ){
        // Only validate date range if both dates are provided
        if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("Start date cannot be after end date.");
        }

        LocalDate today = LocalDate.now();

        // Default to "today" if no filters are specified
        boolean hasFilters = startDate != null || endDate != null || status != null ||
                           (search != null && !search.isBlank()) || (tagIds != null && !tagIds.isEmpty());

        if (quickFilter == null && !hasFilters) {
            quickFilter = "today";
        }

        // Don't set startDate/endDate for quick filters
        // Just pass the quickFilter to the service to handle the date logic there
        // This allows other filters (tags, search) to work with the quick filter date logic

        Set<Long> tagIdSet = tagIds != null ? new HashSet<>(tagIds) : Collections.emptySet();
        List<Task> tasks = taskService.findTasksFiltered(startDate, endDate, status, search, tagIdSet, showHiddenTasks, quickFilter);
        model.addAttribute("tasks", tasks);
        model.addAttribute("showHiddenTasks", showHiddenTasks);

        // Always sort: start date, then name, then status (custom order)
        List<Status> statusOrder = Arrays.asList(Status.TODO, Status.IN_PROGRESS, Status.DONE, Status.BLOCKED);
        tasks.sort(
            Comparator.comparing((Task t) -> t.getDate() == null ? LocalDate.MAX : t.getDate())
                .thenComparing(Task::getName, String.CASE_INSENSITIVE_ORDER)
                .thenComparing(t -> statusOrder.indexOf(t.getStatus()))
        );

        model.addAttribute("tasks", tasks);
        model.addAttribute("startDate", startDate);
        model.addAttribute("endDate", endDate);
        model.addAttribute("status", status);
        model.addAttribute("search", search);
        model.addAttribute("allStatuses", Status.values());

        List<Tag> allTags = tagService.findAll();
        model.addAttribute("allTags", allTags);
        model.addAttribute("selectedTagIds", tagIdSet);

        model.addAttribute("newTask", new Task());
        model.addAttribute("quickFilter", quickFilter);

        // Applied filters label
        StringBuilder filterLabel = new StringBuilder();
        if (quickFilter != null) filterLabel.append("Quick: ").append(quickFilter).append(" ");
        if (startDate != null) filterLabel.append("Start: ").append(startDate).append(" ");
        if (endDate != null) filterLabel.append("End: ").append(endDate).append(" ");
        if (status != null) filterLabel.append("Status: ").append(status).append(" ");
        if (search != null && !search.isBlank()) filterLabel.append("Search: ").append(search).append(" ");
        if (tagIdSet != null && !tagIdSet.isEmpty()) filterLabel.append("Tags: ").append(
                allTags.stream().filter(t -> tagIdSet.contains(t.getId())).map(Tag::getName).toList()
        );
        model.addAttribute("appliedFilters", filterLabel.toString().trim());

        return "index";
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public String handleIllegalArgument(IllegalArgumentException ex, RedirectAttributes redirectAttributes) {
        redirectAttributes.addFlashAttribute("error", ex.getMessage());
        return "redirect:/tasks";
    }

    @GetMapping("/new")
    public String addTaskForm(Model model){
        model.addAttribute("task", new Task());
        model.addAttribute("allStatuses", Status.values());
        model.addAttribute("allTags", tagService.findAll());
        return "add-task";
    }

    @PostMapping("/new")
    public String addTaskSubmit(
            @Valid @ModelAttribute Task task,
            BindingResult bindingResult,
            @RequestParam(required = false) List<Long> tagIds,
            Model model) {

        if (bindingResult.hasErrors()) {
            model.addAttribute("allStatuses", Status.values());
            model.addAttribute("allTags", tagService.findAll());
            return "add-task";
        }

        if (tagIds != null && !tagIds.isEmpty()) {
            List<Tag> validTags = tagService.findAllByIds(tagIds);
            if (validTags.size() != tagIds.size()) {
                bindingResult.reject("tag.invalid", "One or more selected tags do not exist.");
                model.addAttribute("allStatuses", Status.values());
                model.addAttribute("allTags", tagService.findAll());
                return "add-task";
            }
            task.setTags(new HashSet<>(validTags));
        }

        taskService.save(task);
        return "redirect:/tasks";
    }


    @PostMapping("/quick-add")
    public String quickAddTask(@RequestParam String name, @RequestParam(required = false) String details){
        if(name == null || name.trim().isEmpty()){
            // handle error? For simplicity, ignore here or add flash attribute for message
            return "redirect:/tasks";
        }
        Task task = new Task();
        task.setName(name.trim());
        task.setDetails(details != null ? details.trim() : null);
        // date and status default set in Task constructor
        taskService.save(task);
        return "redirect:/tasks";
    }

    @GetMapping("/{id}")
    public String viewTask(@PathVariable Long id, Model model){
        Optional<Task> taskOpt = taskService.findById(id);
        if(taskOpt.isEmpty()){
            return "redirect:/tasks";
        }
        model.addAttribute("task", taskOpt.get());
        model.addAttribute("allStatuses", Status.values());
        model.addAttribute("allTags", tagService.findAll());
        return "task-detail";
    }

    @PostMapping("/{id}/update")
    public String updateTask(@PathVariable Long id,
                             @RequestParam String name,
                             @RequestParam String details,
                             @RequestParam Status status,
                             @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
                             @RequestParam(required = false) List<Long> tagIds
    ){
        Optional<Task> taskOpt = taskService.findById(id);
        if(taskOpt.isEmpty()){
            return "redirect:/tasks";
        }
        Task task = taskOpt.get();
        task.setName(name);
        task.setDetails(details);
        task.setStatus(status);
        task.setDate(date);

        // Set end date based on status
        if (status == Status.DONE) {
            task.setEndDate(LocalDate.now());
        } else {
            task.setEndDate(null);
        }

        if(tagIds != null){
            Set<Tag> tags = tagService.findAll().stream()
                    .filter(t -> tagIds.contains(t.getId()))
                    .collect(Collectors.toSet());
            task.setTags(tags);
        } else {
            task.setTags(new HashSet<>());
        }
        taskService.save(task);
        return "redirect:/tasks";
    }

    @PostMapping("/{id}/update-status")
    public String updateStatusInline(@PathVariable Long id, @RequestParam Status status){
        Optional<Task> taskOpt = taskService.findById(id);
        if(taskOpt.isEmpty()){
            return "redirect:/tasks";
        }
        Task task = taskOpt.get();
        task.setStatus(status);
        if (status == Status.DONE) {
            task.setEndDate(LocalDate.now());
        } else {
            task.setEndDate(null);
        }
        taskService.save(task);
        return "redirect:/tasks";
    }

    @PostMapping("/{id}/update-date")
    public String updateDateInline(@PathVariable Long id, @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date){
        Optional<Task> taskOpt = taskService.findById(id);
        if(taskOpt.isEmpty()){
            return "redirect:/tasks";
        }
        Task task = taskOpt.get();
        task.setDate(date);
        taskService.save(task);
        return "redirect:/tasks?startDate=" + date + "&endDate=" + date;
    }

    @PostMapping("/{id}/update-name")
    public String updateNameInline(@PathVariable Long id, @RequestParam String name) {
        Optional<Task> taskOpt = taskService.findById(id);
        if (taskOpt.isEmpty()) {
            return "redirect:/tasks";
        }
        Task task = taskOpt.get();
        task.setName(name);
        taskService.save(task);
        return "redirect:/tasks";
    }

    @PostMapping("/{id}/toggle-hide")
    public String toggleHideForToday(@PathVariable Long id, @RequestParam(required = false) Boolean hiddenForToday, @RequestHeader(value = "referer", required = false) String referer) {
        taskService.findById(id).ifPresent(task -> {
            task.setHiddenForToday(hiddenForToday != null && hiddenForToday);
            taskService.save(task);
        });
        return "redirect:" + (referer != null ? referer : "/tasks");
    }

    // Bulk Actions

    @PostMapping("/bulk-delete")
    public String bulkDelete(@RequestParam List<Long> taskIds){
        taskService.deleteAllByIds(taskIds);
        return "redirect:/tasks";
    }

    @PostMapping("/bulk-move")
    public String bulkMove(@RequestParam List<Long> taskIds,
                           @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate newDate){
        taskService.moveTasksToDate(taskIds, newDate);
        return "redirect:/tasks?startDate=" + newDate + "&endDate=" + newDate;
    }

    @PostMapping("/bulk-copy")
    public String bulkCopy(@RequestParam List<Long> taskIds,
                           @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate newDate){
        taskService.copyTasksToDate(taskIds, newDate);
        return "redirect:/tasks?startDate=" + newDate + "&endDate=" + newDate;
    }

    @PostMapping("/{id}/move")
    public String moveTask(@PathVariable Long id,
                           @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate newDate){
        taskService.moveTasksToDate(Collections.singletonList(id), newDate);
        return "redirect:/tasks?startDate=" + newDate + "&endDate=" + newDate;
    }

    @PostMapping("/{id}/copy")
    public String copyTask(@PathVariable Long id,
                           @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate newDate){
        taskService.copyTasksToDate(Collections.singletonList(id), newDate);
        return "redirect:/tasks?startDate=" + newDate + "&endDate=" + newDate;
    }

    @GetMapping("/{id}/copy-task")
    public String copyTaskDirectly(@PathVariable Long id) {
        Optional<Task> taskOpt = taskService.findById(id);
        if (taskOpt.isEmpty()) {
            return "redirect:/tasks";
        }

        // Create a new task with the same properties
        Task originalTask = taskOpt.get();
        Task newTask = new Task();
        newTask.setName(originalTask.getName() + " (Copy)");
        newTask.setDetails(originalTask.getDetails());
        newTask.setStatus(originalTask.getStatus());
        newTask.setDate(originalTask.getDate());

        // Copy tags
        if (originalTask.getTags() != null && !originalTask.getTags().isEmpty()) {
            newTask.setTags(new HashSet<>(originalTask.getTags()));
        }

        taskService.save(newTask);

        return "redirect:/tasks";
    }

    @GetMapping("/export/excel")
    public void exportToExcel(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Status status,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) List<Long> tagIds,
            @RequestParam(required = false) String quickFilter,
            @RequestParam(required = false, defaultValue = "false") Boolean showHiddenTasks,
            @RequestParam(required = false, defaultValue = "false") Boolean isCompactMode,
            HttpServletResponse response
    ) throws IOException {
        // Generate filename with timestamp
        String timestamp = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        String filename = "tasks_" + timestamp + ".xls"; // Changed to .xls extension

        // Set the content type and header for the Excel file
        response.setContentType("application/vnd.ms-excel"); // Changed content type for .xls format
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"");

        // Only validate date range if both dates are provided
        if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("Start date cannot be after end date.");
        }

        // Default to "today" if no filters are specified
        boolean hasFilters = startDate != null || endDate != null || status != null ||
                           (search != null && !search.isBlank()) || (tagIds != null && !tagIds.isEmpty());

        if (quickFilter == null && !hasFilters) {
            quickFilter = "today";
        }

        Set<Long> tagIdSet = tagIds != null ? new HashSet<>(tagIds) : Collections.emptySet();
        List<Task> tasks = taskService.findTasksFiltered(startDate, endDate, status, search, tagIdSet, showHiddenTasks, quickFilter);

        // Sort tasks the same way as in the UI
        List<Status> statusOrder = Arrays.asList(Status.TODO, Status.IN_PROGRESS, Status.DONE, Status.BLOCKED);
        tasks.sort(
            Comparator.comparing((Task t) -> t.getDate() == null ? LocalDate.MAX : t.getDate())
                .thenComparing(Task::getName, String.CASE_INSENSITIVE_ORDER)
                .thenComparing(t -> statusOrder.indexOf(t.getStatus()))
        );

        // Generate Excel file and write to response output stream
        excelExportService.exportTasksToExcel(tasks, response.getOutputStream(), isCompactMode);
    }
}
