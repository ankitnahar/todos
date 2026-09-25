#!/bin/bash
# Restart both backend and frontend
# Usage: ./restart.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Restarting Notes App..."
"$SCRIPT_DIR/stop.sh"
sleep 2
"$SCRIPT_DIR/start.sh" &
disown
