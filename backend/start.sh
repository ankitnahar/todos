#!/bin/bash

# Quick start script for the Notes Backend Application

echo "=========================================="
echo "Notes Management Backend - Quick Start"
echo "=========================================="
echo ""

# Check if Java is installed
if ! command -v java &> /dev/null; then
    echo "ERROR: Java is not installed. Please install Java 17 or higher."
    exit 1
fi

# Check Java version
JAVA_VERSION=$(java -version 2>&1 | awk -F '"' '/version/ {print $2}' | cut -d'.' -f1)
if [ "$JAVA_VERSION" -lt 17 ]; then
    echo "ERROR: Java 17 or higher is required. Current version: $JAVA_VERSION"
    exit 1
fi

echo "✓ Java version check passed"

# Check if Maven is installed
if ! command -v mvn &> /dev/null; then
    echo "ERROR: Maven is not installed. Please install Maven 3.6 or higher."
    exit 1
fi

echo "✓ Maven check passed"

# Check if database file exists
if [ ! -f "./data/todo.mv.db" ]; then
    echo "WARNING: Database file not found at ./data/todo.mv.db"
    echo "The application will create a new database."
fi

echo ""
echo "Starting the application..."
echo "Server will be available at: http://localhost:8080"
echo "H2 Console: http://localhost:8080/h2-console"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Run the application
mvn spring-boot:run
