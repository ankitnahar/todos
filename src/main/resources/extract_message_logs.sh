#!/bin/bash

# Complete Log Extraction Script
# Usage: ./extract_message_logs.sh <message_id> <date>
# Example: ./extract_message_logs.sh "74f52dab-96ca-4aa0-ac9f-44ba21d837ea" "2025-11-11"

# Check arguments
if [ $# -ne 2 ]; then
    echo "Usage: $0 <message_id> <date>"
    echo "Example: $0 '74f52dab-96ca-4aa0-ac9f-44ba21d837ea' '2025-11-11'"
    exit 1
fi

MESSAGE_ID="$1"
LOG_DATE="$2"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_DIR="/opt/costsandincomes/log"
SEARCH_PATTERN="${LOG_DIR}/costsandincomes.${LOG_DATE}*log.gz"
CONSOLIDATED_LOG="${HOME}/test${TIMESTAMP}.log"
TEMP_DIR="${HOME}/temp_logs_${TIMESTAMP}"

echo "=================================================="
echo "Log Extraction Script"
echo "=================================================="
echo "Message ID: ${MESSAGE_ID}"
echo "Date: ${LOG_DATE}"
echo "Search Pattern: ${SEARCH_PATTERN}"
echo "=================================================="

# Step 1: Find files containing the message ID
echo ""
echo "[Step 1] Searching for files containing message ID..."
MATCHING_FILES=$(zgrep -l "${MESSAGE_ID}" ${SEARCH_PATTERN} 2>/dev/null)

if [ -z "${MATCHING_FILES}" ]; then
    echo "ERROR: No files found containing message ID '${MESSAGE_ID}'"
    exit 1
fi

echo "Found files:"
echo "${MATCHING_FILES}"
echo ""

# Step 2: Create temp directory and copy files
echo "[Step 2] Creating temporary directory and copying files..."
mkdir -p "${TEMP_DIR}"

# Step 3: Copy, decompress, and consolidate logs
echo "[Step 3] Decompressing and consolidating logs..."
> "${CONSOLIDATED_LOG}"  # Create empty file

for gz_file in ${MATCHING_FILES}; do
    filename=$(basename "${gz_file}")
    echo "Processing: ${filename}"
    
    # Copy to temp directory
    cp "${gz_file}" "${TEMP_DIR}/"
    
    # Decompress
    gunzip -f "${TEMP_DIR}/${filename}"
    
    # Get decompressed filename (remove .gz extension)
    decompressed_file="${TEMP_DIR}/${filename%.gz}"
    
    # Append to consolidated log
    cat "${decompressed_file}" >> "${CONSOLIDATED_LOG}"
done

echo "Consolidated log created: ${CONSOLIDATED_LOG}"
echo ""

# Step 4: Extract logs for each execution (each unique thread group)
echo "[Step 4] Extracting logs for each execution..."

awk -v id="${MESSAGE_ID}" -v output_prefix="${HOME}/test1_execution" '
{
  # Store all lines
  lines[NR] = $0
  
  # Extract thread ID from current line if present
  if (match($0, /pool-[0-9]+-thread-[0-9]+/)) {
    thread[NR] = substr($0, RSTART, RLENGTH)
  }
  
  # Track lines with message ID
  if ($0 ~ id) {
    msg_lines[++msg_count] = NR
    msg_threads[msg_count] = thread[NR]
  }
}
END {
  if (msg_count < 2) {
    print "WARNING: Found only " msg_count " occurrence(s) of message ID. Need at least 2."
    exit
  }
  
  print "Found " msg_count " occurrences of message ID"
  
  # Group occurrences by thread to identify separate executions
  execution_num = 0
  processed[1] = 0  # Mark first occurrence as not processed
  
  i = 1
  while (i <= msg_count) {
    if (processed[i]) {
      i++
      continue
    }
    
    # Start new execution
    execution_num++
    first_line = msg_lines[i]
    target_thread = msg_threads[i]
    last_line = first_line
    
    # Find the last occurrence with same thread (or just next different thread)
    for (j = i + 1; j <= msg_count; j++) {
      if (msg_threads[j] == target_thread || thread[msg_lines[j]] == target_thread) {
        last_line = msg_lines[j]
        processed[j] = 1
      }
    }
    
    # If no matching end found, look for last occurrence before thread changes
    if (last_line == first_line) {
      for (j = i + 1; j <= msg_count; j++) {
        if (msg_threads[j] != target_thread) {
          break
        }
        last_line = msg_lines[j]
        processed[j] = 1
      }
    }
    
    # If still only one occurrence, just use it
    if (last_line == first_line && i < msg_count) {
      last_line = msg_lines[i+1]
      processed[i+1] = 1
    }
    
    output_file = output_prefix "_" execution_num ".log"
    print "Execution " execution_num ": Thread=" target_thread " Lines=" first_line "-" last_line " -> " output_file
    
    # Print all lines between first and last that match the thread
    for (k = first_line; k <= last_line; k++) {
      if (thread[k] == target_thread) {
        print lines[k] > output_file
      }
    }
    
    processed[i] = 1
    i++
  }
  
  print ""
  print "Extraction complete! Created " execution_num " execution log file(s)"
}' "${CONSOLIDATED_LOG}"

# Step 5: Cleanup
echo ""
echo "[Step 5] Cleanup..."
read -p "Delete temporary directory ${TEMP_DIR}? (y/n): " cleanup_choice
if [ "${cleanup_choice}" = "y" ] || [ "${cleanup_choice}" = "Y" ]; then
    rm -rf "${TEMP_DIR}"
    echo "Temporary directory deleted."
else
    echo "Temporary directory preserved: ${TEMP_DIR}"
fi

echo ""
echo "=================================================="
echo "Script completed successfully!"
echo "Consolidated log: ${CONSOLIDATED_LOG}"
echo "Execution logs: ${HOME}/test1_execution_*.log"
echo "=================================================="
