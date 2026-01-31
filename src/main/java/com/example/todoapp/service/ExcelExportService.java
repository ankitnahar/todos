package com.example.todoapp.service;

import com.example.todoapp.model.Tag;
import com.example.todoapp.model.Task;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;

@Service
public class ExcelExportService {

    /**
     * Export tasks to Excel based on the view mode.
     * @param tasks List of tasks to export
     * @param isCompactMode Whether the export should be in compact mode (name and status only)
     * @return Excel file as byte array
     */
    public byte[] exportTasksToExcel(List<Task> tasks, boolean isCompactMode) throws IOException {
        // Use HSSFWorkbook (XLS format) which has better compatibility
        try (Workbook workbook = new HSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Tasks");

            // Create header style
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            // Create header row
            Row headerRow = sheet.createRow(0);
            int columnIndex = 0;

            // Basic columns for all modes
            Cell cellHeader = headerRow.createCell(columnIndex++);
            cellHeader.setCellValue("Name");
            cellHeader.setCellStyle(headerStyle);

            cellHeader = headerRow.createCell(columnIndex++);
            cellHeader.setCellValue("Status");
            cellHeader.setCellStyle(headerStyle);

            // Additional columns for full mode
            if (!isCompactMode) {
                cellHeader = headerRow.createCell(columnIndex++);
                cellHeader.setCellValue("Date");
                cellHeader.setCellStyle(headerStyle);

                cellHeader = headerRow.createCell(columnIndex++);
                cellHeader.setCellValue("End Date");
                cellHeader.setCellStyle(headerStyle);

                cellHeader = headerRow.createCell(columnIndex++);
                cellHeader.setCellValue("Important");
                cellHeader.setCellStyle(headerStyle);

                cellHeader = headerRow.createCell(columnIndex++);
                cellHeader.setCellValue("Hidden");
                cellHeader.setCellStyle(headerStyle);

                cellHeader = headerRow.createCell(columnIndex++);
                cellHeader.setCellValue("Tags");
                cellHeader.setCellStyle(headerStyle);

                cellHeader = headerRow.createCell(columnIndex++);
                cellHeader.setCellValue("Details");
                cellHeader.setCellStyle(headerStyle);
            }

            // Fill data rows
            DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
            int rowNum = 1;
            for (Task task : tasks) {
                Row row = sheet.createRow(rowNum++);
                int colNum = 0;

                // Basic data for all modes
                Cell nameCell = row.createCell(colNum++);
                nameCell.setCellValue(task.getName());

                Cell statusCell = row.createCell(colNum++);
                statusCell.setCellValue(task.getStatus() != null ? task.getStatus().toString() : "");

                // Additional data for full mode
                if (!isCompactMode) {
                    // Date
                    Cell dateCell = row.createCell(colNum++);
                    LocalDate date = task.getDate();
                    dateCell.setCellValue(date != null ? date.format(dateFormatter) : "");

                    // End Date
                    Cell endDateCell = row.createCell(colNum++);
                    LocalDate endDate = task.getEndDate();
                    endDateCell.setCellValue(endDate != null ? endDate.format(dateFormatter) : "");

                    // Important
                    Cell importantCell = row.createCell(colNum++);
                    importantCell.setCellValue(task.getImportant() != null && task.getImportant());

                    // Hidden
                    Cell hiddenCell = row.createCell(colNum++);
                    hiddenCell.setCellValue(task.getHiddenForToday() != null && task.getHiddenForToday());

                    // Tags
                    Cell tagsCell = row.createCell(colNum++);
                    String tags = task.getTags() != null ?
                        task.getTags().stream()
                            .map(Tag::getName)
                            .collect(Collectors.joining(", "))
                        : "";
                    tagsCell.setCellValue(tags);

                    // Details
                    Cell detailsCell = row.createCell(colNum++);
                    detailsCell.setCellValue(task.getDetails() != null ? task.getDetails() : "");
                }
            }

            // Auto-size columns for better readability
            for (int i = 0; i < columnIndex; i++) {
                sheet.autoSizeColumn(i);
            }

            // Write to byte array
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            workbook.write(outputStream);
            return outputStream.toByteArray();
        }
    }

    /**
     * Export tasks to Excel and write directly to the output stream
     * @param tasks List of tasks to export
     * @param outputStream The output stream to write to
     * @param isCompactMode Whether to export in compact mode (name and status only)
     */
    public void exportTasksToExcel(List<Task> tasks, OutputStream outputStream, boolean isCompactMode) throws IOException {
        byte[] excelData = exportTasksToExcel(tasks, isCompactMode);
        outputStream.write(excelData);
        outputStream.flush();
    }
}
