#!/bin/bash
# Extract logs between first and last occurrence of a message ID
# Filters by thread ID from the first occurrence

cat test.log | \
awk -v id="74f52dab-96ca-4aa0-ac9f-44ba21d837ea" '
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
  }
}
END {
  if (msg_count >= 2) {
    # Get first and last occurrence
    first_line = msg_lines[1]
    last_line = msg_lines[msg_count]
    target_thread = thread[first_line]
    
    # Print all lines between first and last that match the thread
    for (i = first_line; i <= last_line; i++) {
      if (thread[i] == target_thread) {
        print lines[i]
      }
    }
  }
}' > test1.log
