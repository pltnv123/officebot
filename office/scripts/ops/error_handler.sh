#!/bin/bash
# Error Handler — remembers errors, finds solutions, prevents repetition
# Usage: bash error_handler.sh "error message" "context"
# Auto-fixes known errors, logs unknown ones

ERROR_LOG="/home/antonbot/.openclaw/workspace/office/scripts/ops/errors.log"
SOLUTIONS_DB="/home/antonbot/.openclaw/workspace/office/scripts/ops/solutions.json"

ERROR_MSG="${1:?Usage: $0 <error_message> <context>}"
CONTEXT="${2:-unknown}"

TIMESTAMP=$(date -u "+%Y-%m-%d %H:%M:%S UTC")

# Count how many times this error occurred
COUNT=$(grep -c "$ERROR_MSG" "$ERROR_LOG" 2>/dev/null || echo 0)
COUNT=$((COUNT + 1))

# Log error
echo "[$TIMESTAMP] [$COUNT] [$CONTEXT] $ERROR_MSG" >> "$ERROR_LOG"

# Check solutions database
SOLUTION=$(python3 -c "
import json, os
db = {}
if os.path.exists('$SOLUTIONS_DB'):
    with open('$SOLUTIONS_DB') as f:
        db = json.load(f)
for pattern, sol in db.items():
    if pattern in '''$ERROR_MSG''':
        print(sol)
        exit(0)
print('UNKNOWN')
" 2>/dev/null)

if [ "$SOLUTION" = "UNKNOWN" ]; then
    echo "NEW_ERROR: $ERROR_MSG (occurrence #$COUNT)"
    echo "No solution yet. Logged for future prevention."
    exit 1
else
    echo "KNOWN_ERROR: $ERROR_MSG (occurrence #$COUNT)"
    echo "SOLUTION: $SOLUTION"
    exit 0
fi
