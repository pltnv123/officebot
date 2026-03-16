#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./progress.sh TASK_ID SUBTASK_INDEX set 12
#   ./progress.sh TASK_ID SUBTASK_INDEX add 3
#   ./progress.sh TASK_ID SUBTASK_INDEX sub 2
# Example:
#   ./progress.sh CHAT-SYNC-001 2 add 1.5

TASK_ID="${1:-}"
SUB_IDX="${2:-}"
MODE="${3:-}"
VALUE="${4:-}"

if [[ -z "$TASK_ID" || -z "$SUB_IDX" || -z "$MODE" || -z "$VALUE" ]]; then
  echo "Usage: $0 TASK_ID SUBTASK_INDEX set|add|sub VALUE" >&2
  exit 1
fi

SCRIPT_DIR=$(cd -- "$(dirname "$0")" >/dev/null 2>&1 && pwd)
TASKS="$SCRIPT_DIR/tasks.json"

python3 - "$TASKS" "$TASK_ID" "$SUB_IDX" "$MODE" "$VALUE" <<'PY'
import json, sys
p, task_id, sub_idx, mode, value = sys.argv[1:]
sub_idx = int(sub_idx)
value = float(value)

with open(p, 'r', encoding='utf-8') as f:
    d = json.load(f)

found = False
for t in d.get('tasks', []):
    if t.get('id') != task_id:
        continue
    subs = t.get('subtasks', [])
    if sub_idx < 1 or sub_idx > len(subs):
        raise SystemExit(f"subtask index out of range: 1..{len(subs)}")
    s = subs[sub_idx - 1]
    est = float(s.get('estimate', 0) or 0)
    actual = float(s.get('actual', 0) or 0)

    if mode == 'set':
        actual = value
    elif mode == 'add':
        actual = actual + value
    elif mode == 'sub':
        actual = actual - value
    else:
        raise SystemExit("mode must be set|add|sub")

    if est > 0:
        actual = max(0.0, min(est, actual))
        progress = round((actual / est) * 100, 1)
    else:
        actual = max(0.0, actual)
        progress = float(s.get('progress', 0) or 0)

    s['actual'] = round(actual, 2)
    s['progress'] = progress
    if progress >= 100:
        s['status'] = 'done'
    elif progress > 0:
        s['status'] = 'doing'

    # recompute parent
    est_t = sum(float(x.get('estimate', 0) or 0) for x in subs)
    act_t = sum(float(x.get('actual', 0) or 0) for x in subs)
    t['estimate'] = round(est_t, 2)
    t['actual'] = round(act_t, 2)
    t['progress'] = round((act_t / est_t) * 100, 1) if est_t > 0 else 0
    st = [x.get('status', 'todo') for x in subs]
    t['status'] = 'done' if st and all(x == 'done' for x in st) else ('doing' if 'doing' in st else 'todo')
    found = True

if not found:
    raise SystemExit(f"task not found: {task_id}")

with open(p, 'w', encoding='utf-8') as f:
    json.dump(d, f, ensure_ascii=False, indent=2)

print('ok')
PY

install -m 644 "$TASKS" /var/www/office/tasks.json
bash /var/www/office/update_state.sh >/dev/null
echo "progress updated: $TASK_ID#$SUB_IDX $MODE $VALUE"