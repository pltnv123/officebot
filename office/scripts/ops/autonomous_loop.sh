#!/bin/bash
# ═══════════════════════════════════════════════════════════
# Autonomous Agent Loop — OfficeBot
# Checks tasks → routes to agents → executes → updates status → Telegram
# ═══════════════════════════════════════════════════════════

set -euo pipefail

ROOT="/home/antonbot/.openclaw/workspace/office"
STATE_FILE="$ROOT/state.json"
QUEUE_FILE="$ROOT/task_queue.json"
LOG_FILE="$ROOT/backend/autonomous.log"
PID_FILE="$ROOT/backend/autonomous.pid"

# Lock to prevent double-run
if [ -f "$PID_FILE" ]; then
  OLD_PID=$(cat "$PID_FILE" 2>/dev/null || echo "")
  if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
    echo "[$(date -u +%H:%M:%S)] Already running (PID $OLD_PID), exiting."
    exit 0
  fi
fi
echo $$ > "$PID_FILE"
trap 'rm -f "$PID_FILE"' EXIT

log() {
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*" | tee -a "$LOG_FILE"
}

notify_telegram() {
  local agent="$1"
  local msg="$2"
  bash "$ROOT/scripts/telegram/agent_report.sh" "$agent" "$msg" 2>/dev/null || true
}

check_node_deps() {
  cd "$ROOT/backend"
  if [ ! -d node_modules/express ]; then
    log "Installing backend dependencies..."
    npm install 2>/dev/null || true
  fi
}

get_queue_stats() {
  if [ ! -f "$QUEUE_FILE" ]; then
    echo '{"pending":0,"in_progress":0,"completed":0,"failed":0,"total":0}'
    return
  fi
  node -e "
    const q = require('$QUEUE_FILE');
    const tasks = q.tasks || [];
    const s = {pending:0, in_progress:0, completed:0, failed:0, total: tasks.length};
    tasks.forEach(t => s[t.status] = (s[t.status]||0) + 1);
    process.stdout.write(JSON.stringify(s));
  " 2>/dev/null || echo '{"pending":0,"in_progress":0,"completed":0,"failed":0,"total":0}'
}

get_next_pending() {
  if [ ! -f "$QUEUE_FILE" ]; then
    echo ""
    return
  fi
  node -e "
    const q = require('$QUEUE_FILE');
    const tasks = q.tasks || [];
    const p = tasks.find(t => t.status === 'pending');
    if (p) process.stdout.write(JSON.stringify(p));
  " 2>/dev/null || echo ""
}

detect_agent() {
  local task_text="$1"
  node -e "
    const mapping = require('$ROOT/agents/agency/MAPPING.json');
    const text = '$task_text'.toLowerCase();
    let best = null, bestScore = 0;
    for (const [key, config] of Object.entries(mapping)) {
      let score = 0;
      for (const t of (config.triggers || [])) {
        if (text.includes(t.toLowerCase())) score += t.length;
      }
      if (score > bestScore) { bestScore = score; best = {key, robot: config.robot, zone: config.zone}; }
    }
    if (best) process.stdout.write(JSON.stringify(best));
    else process.stdout.write(JSON.stringify({key:'engineering/senior-developer',robot:'WORKER',zone:'ENGINEERING'}));
  " 2>/dev/null || echo '{"key":"engineering/senior-developer","robot":"WORKER","zone":"ENGINEERING"}'
}

mark_task_status() {
  local task_id="$1"
  local status="$2"
  node -e "
    const fs = require('fs');
    const q = JSON.parse(fs.readFileSync('$QUEUE_FILE', 'utf8'));
    const t = (q.tasks||[]).find(x => x.id === '$task_id');
    if (t) {
      t.status = '$status';
      t['${status}_at'] = new Date().toISOString();
      fs.writeFileSync('$QUEUE_FILE', JSON.stringify(q, null, 2));
    }
  " 2>/dev/null || true
}

update_agent_state() {
  local agent_id="$1"
  local status="$2"
  local task_id="$3"
  node -e "
    const fs = require('fs');
    let state = {};
    try { state = JSON.parse(fs.readFileSync('$STATE_FILE', 'utf8')); } catch {}
    if (!Array.isArray(state.agents)) state.agents = [];
    const idx = state.agents.findIndex(a => a.id === '$agent_id');
    const a = {id:'$agent_id', role:'$agent_id'.toUpperCase(), status:'$status', currentTask:'$task_id'||null, updatedAt: new Date().toISOString()};
    if (idx >= 0) state.agents[idx] = {...state.agents[idx], ...a};
    else state.agents.push(a);
    state.timestamp = new Date().toISOString();
    fs.writeFileSync('$STATE_FILE', JSON.stringify(state, null, 2));
  " 2>/dev/null || true
}

execute_task() {
  local task_id="$1"
  local task_title="$2"
  local agent_key="$3"
  local robot="$4"

  local robot_lower
  robot_lower=$(echo "$robot" | tr '[:upper:]' '[:lower:]')

  log "▶ Executing: [$task_id] '$task_title' → agent=$agent_key robot=$robot_lower"

  # Mark task as in_progress
  mark_task_status "$task_id" "in_progress"
  update_agent_state "$robot_lower" "working" "$task_id"
  notify_telegram "$robot_lower" "🔄 Взял задачу: $task_title"

  # Execute via openclaw
  local result
  if result=$(cd "$ROOT" && openclaw agent --agent "$robot_lower" --message "Task: $task_title" --deliver 2>&1); then
    log "✅ Done: [$task_id]"
    mark_task_status "$task_id" "completed"
    update_agent_state "$robot_lower" "idle" ""
    notify_telegram "$robot_lower" "✅ Завершил: $task_title"
    return 0
  else
    log "❌ Failed: [$task_id] $result"
    mark_task_status "$task_id" "failed"
    update_agent_state "$robot_lower" "error" "$task_id"
    notify_telegram "$robot_lower" "❌ Ошибка: $task_title"
    # Reset for retry
    mark_task_status "$task_id" "pending"
    update_agent_state "$robot_lower" "idle" ""
    return 1
  fi
}

# ═══════════════════════════════════════════════════════════
# Main loop
# ═══════════════════════════════════════════════════════════

CYCLE_INTERVAL="${1:-10}"  # seconds between cycles, default 10
MAX_CYCLES="${2:-0}"       # 0 = infinite

log "🚀 Autonomous loop started (interval=${CYCLE_INTERVAL}s, max_cycles=${MAX_CYCLES})"
notify_telegram "chief" "🤖 Автономный цикл запущен (интервал: ${CYCLE_INTERVAL}s)"

check_node_deps

cycle=0
while true; do
  cycle=$((cycle + 1))
  log "── Cycle $cycle ──"

  # 1. Check queue
  stats=$(get_queue_stats)
  pending=$(echo "$stats" | node -e "process.stdout.write(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).pending||0)" 2>/dev/null || echo 0)

  log "📊 Queue: $stats"

  if [ "$pending" -eq 0 ]; then
    log "💤 No pending tasks, sleeping..."
  else
    # 2. Get next pending task
    next_task=$(get_next_pending)
    if [ -n "$next_task" ]; then
      task_id=$(echo "$next_task" | node -e "process.stdout.write(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).id)" 2>/dev/null || echo "")
      task_title=$(echo "$next_task" | node -e "process.stdout.write(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).title)" 2>/dev/null || echo "")

      if [ -n "$task_id" ] && [ -n "$task_title" ]; then
        # 3. Detect agent
        agent_info=$(detect_agent "$task_title")
        agent_key=$(echo "$agent_info" | node -e "process.stdout.write(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).key)" 2>/dev/null || echo "engineering/senior-developer")
        robot=$(echo "$agent_info" | node -e "process.stdout.write(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).robot)" 2>/dev/null || echo "WORKER")

        # 4. Execute
        execute_task "$task_id" "$task_title" "$agent_key" "$robot"
      fi
    fi
  fi

  # 5. Check running tasks status (handled by server.js endpoints)
  # 6. Update Telegram with cycle summary (every 10 cycles)
  if [ $((cycle % 10)) -eq 0 ]; then
    stats=$(get_queue_stats)
    notify_telegram "chief" "📊 Цикл $cycle: $stats"
  fi

  # Check max cycles
  if [ "$MAX_CYCLES" -gt 0 ] && [ "$cycle" -ge "$MAX_CYCLES" ]; then
    log "🏁 Max cycles ($MAX_CYCLES) reached, stopping."
    notify_telegram "chief" "🏁 Автономный цикл завершён ($MAX_CYCLES циклов)"
    break
  fi

  sleep "$CYCLE_INTERVAL"
done

log "Autonomous loop ended."
