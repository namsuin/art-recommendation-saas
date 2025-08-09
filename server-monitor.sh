#!/bin/bash

# Server Monitor and Auto-Recovery Script
# This script monitors the server and automatically restarts it if it goes down

SERVER_URL="http://localhost:3000/api/health"
LOG_FILE="server-monitor.log"
SERVER_COMMAND="bun --hot ./fixed-server.ts"
CHECK_INTERVAL=30  # Check every 30 seconds

echo "$(date): Server monitor started" >> "$LOG_FILE"

while true; do
    # Check if server is responding
    if curl -s -f "$SERVER_URL" > /dev/null 2>&1; then
        # Server is running
        echo "$(date): Server is healthy" >> "$LOG_FILE"
    else
        # Server is down, restart it
        echo "$(date): Server is down, attempting to restart..." >> "$LOG_FILE"
        
        # Kill any existing process
        pkill -f "bun.*fixed-server" || true
        
        # Wait a moment
        sleep 2
        
        # Start server
        nohup $SERVER_COMMAND > server.log 2>&1 &
        
        echo "$(date): Server restart command executed" >> "$LOG_FILE"
        
        # Wait for server to start
        sleep 5
        
        # Verify server is running
        if curl -s -f "$SERVER_URL" > /dev/null 2>&1; then
            echo "$(date): Server successfully restarted" >> "$LOG_FILE"
        else
            echo "$(date): Server restart failed" >> "$LOG_FILE"
        fi
    fi
    
    # Wait before next check
    sleep $CHECK_INTERVAL
done