#!/bin/bash
# Response Tracker - отслеживание времени ответов

LOG="/home/antonbot/.openclaw/workspace/office/scripts/ops/response_times.log"

track_response() {
    local start_time="$1"
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    echo "[$(date -u '+%H:%M:%S')] Response time: ${duration}s" >> "$LOG"
    
    if [ $duration -gt 120 ]; then
        echo "⚠️ SLOW: ${duration}s (>2min)" >> "$LOG"
    fi
}

log_event() {
    echo "[$(date -u '+%H:%M:%S')] $1" >> "$LOG"
}

case "$1" in
    track) track_response "$2" ;;
    log) log_event "$2" ;;
    *) echo "Usage: $0 track <start_unix>|log 'message'" ;;
esac
