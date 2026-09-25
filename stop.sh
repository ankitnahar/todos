#!/bin/bash
# Stop both backend and frontend for the Notes App
# Usage: ./stop.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================="
echo "  Notes App - Stopping All Services"
echo "=========================================="

# Kill backend
if [ -f "$SCRIPT_DIR/.backend.pid" ]; then
    BACKEND_PID=$(cat "$SCRIPT_DIR/.backend.pid")
    if kill -0 "$BACKEND_PID" 2>/dev/null; then
        echo "  Stopping backend (PID: $BACKEND_PID)..."
        kill "$BACKEND_PID"
        rm "$SCRIPT_DIR/.backend.pid"
        echo "  Backend stopped."
    else
        echo "  Backend already stopped."
        rm "$SCRIPT_DIR/.backend.pid"
    fi
else
    echo "  No backend PID file found."
fi

# Kill frontend
if [ -f "$SCRIPT_DIR/.frontend.pid" ]; then
    FRONTEND_PID=$(cat "$SCRIPT_DIR/.frontend.pid")
    if kill -0 "$FRONTEND_PID" 2>/dev/null; then
        echo "  Stopping frontend (PID: $FRONTEND_PID)..."
        kill "$FRONTEND_PID"
        rm "$SCRIPT_DIR/.frontend.pid"
        echo "  Frontend stopped."
    else
        echo "  Frontend already stopped."
        rm "$SCRIPT_DIR/.frontend.pid"
    fi
else
    echo "  No frontend PID file found."
fi

# Also kill any remaining processes on the ports
echo ""
echo "  Cleaning up ports..."

# Kill anything on port 8080
PIDS_8080=$(lsof -t -i:8080 2>/dev/null)
if [ -n "$PIDS_8080" ]; then
    echo "  Killing processes on port 8080: $PIDS_8080"
    kill $PIDS_8080 2>/dev/null
fi

# Kill anything on port 3000
PIDS_3000=$(lsof -t -i:3000 2>/dev/null)
if [ -n "$PIDS_3000" ]; then
    echo "  Killing processes on port 3000: $PIDS_3000"
    kill $PIDS_3000 2>/dev/null
fi

echo ""
echo "=========================================="
echo "  All services stopped."
echo "=========================================="
