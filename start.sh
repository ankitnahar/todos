#!/bin/bash
# Start both backend and frontend for the Notes App
# Usage: ./start.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

echo "=========================================="
echo "  Notes App - Starting All Services"
echo "=========================================="

# Check if Java is available
if ! command -v java &> /dev/null; then
    echo "[ERROR] Java is not installed. Please install Java 17+."
    exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed. Please install Node.js 18+."
    exit 1
fi

# Start Backend
echo ""
echo "[1/2] Starting Spring Boot Backend (port 8080)..."
cd "$BACKEND_DIR"

if [ ! -f "mvnw" ]; then
    echo "[ERROR] Maven wrapper not found. Run: cd backend && mvn wrapper:wrapper"
    exit 1
fi

chmod +x mvnw
nohup ./mvnw spring-boot:run -q > "$SCRIPT_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
echo "  Backend PID: $BACKEND_PID"

# Wait for backend to be ready
echo "  Waiting for backend to start..."
for i in {1..30}; do
    if curl -s --max-time 2 http://localhost:9090/api/buckets > /dev/null 2>&1; then
        echo "  Backend is ready!"
        break
    fi
    sleep 2
done

# Start Frontend
echo ""
echo "[2/2] Starting React Frontend (port 3000)..."
cd "$FRONTEND_DIR"

if [ ! -d "node_modules" ]; then
    echo "  Installing frontend dependencies..."
    npm install
fi

nohup npm run dev > "$SCRIPT_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo "  Frontend PID: $FRONTEND_PID"

# Save PIDs for stop script
echo "$BACKEND_PID" > "$SCRIPT_DIR/.backend.pid"
echo "$FRONTEND_PID" > "$SCRIPT_DIR/.frontend.pid"

echo ""
echo "=========================================="
echo "  All services started in background!"
echo "=========================================="
echo ""
echo "  Frontend:  http://localhost:3000"
echo "  Backend:   http://localhost:8080"
echo "  H2 Console: http://localhost:8080/h2-console"
echo ""
echo "  To stop: ./stop.sh"
echo "=========================================="
