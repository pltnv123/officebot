#!/bin/bash
# Self-Improvement System — based on agency-agents
# Inspired by: Incident Response Commander, Code Reviewer, Software Architect
# Runs autonomously to improve code quality, catch errors, learn from mistakes

PROJECT="/home/antonbot/.openclaw/workspace/office"
ERROR_LOG="$PROJECT/scripts/ops/errors.log"
LEARNINGS="$PROJECT/scripts/ops/learnings.json"
CODE_REVIEW_LOG="$PROJECT/scripts/ops/code_reviews.log"

log() { echo "[$(date -u '+%H:%M:%S')] $1" >> "$PROJECT/scripts/ops/self_improve.log"; }

echo "=== Self-Improvement Cycle ==="

# 1. INCIDENT RESPONSE: Check for recurring errors
echo "1. Checking recurring errors..."
if [ -f "$ERROR_LOG" ]; then
    TOP_ERROR=$(tail -100 "$ERROR_LOG" | grep -oP '\[.*?\]' | sort | uniq -c | sort -rn | head -1)
    log "Most common error pattern: $TOP_ERROR"
fi

# 2. CODE REVIEW: Check recent changes for issues
echo "2. Reviewing recent code..."
cd "$PROJECT"
RECENT_CHANGES=$(git diff HEAD~1 --name-only 2>/dev/null | grep "\.cs$\|\.js$")
for file in $RECENT_CHANGES; do
    # Check for common issues
    if [ -f "$file" ]; then
        # Missing null checks
        NULL_ISSUES=$(grep -n "\\.GetComponent" "$file" | grep -v "?." | head -3)
        if [ -n "$NULL_ISSUES" ]; then
            log "REVIEW: $file - possible null reference (GetComponent without ?.)"
        fi
        # Hardcoded values
        HARDCODED=$(grep -n "new Vector3(" "$file" | wc -l)
        if [ "$HARDCODED" -gt 5 ]; then
            log "REVIEW: $file - $HARDCODED hardcoded Vector3 values, consider constants"
        fi
    fi
done

# 3. ARCHITECTURE: Check file sizes (too large = needs refactor)
echo "3. Architecture check..."
find "$PROJECT/UnityProject/Assets/Scripts" -name "*.cs" -size +20k 2>/dev/null | while read f; do
    size=$(wc -l < "$f")
    log "ARCHITECTURE: $(basename $f) is $size lines - consider splitting"
done

# 4. LEARNINGS: Update learnings database
echo "4. Updating learnings..."
python3 << 'PYEOF'
import json, os
learnings_file = os.path.expanduser("~/.openclaw/workspace/office/scripts/ops/learnings.json")
if os.path.exists(learnings_file):
    with open(learnings_file) as f:
        learnings = json.load(f)
else:
    learnings = {"patterns": [], "solutions": [], "metrics": {}}

# Add today's metrics
import datetime
learnings["metrics"][datetime.date.today().isoformat()] = {
    "checks_run": learnings["metrics"].get(datetime.date.today().isoformat(), {}).get("checks_run", 0) + 1
}

with open(learnings_file, 'w') as f:
    json.dump(learnings, f, indent=2)
print("Learnings updated")
PYEOF

echo "=== Cycle complete ==="
log "Self-improvement cycle completed"
