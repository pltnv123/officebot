#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR=$(cd -- "$(dirname "$0")" >/dev/null 2>&1 && pwd)

SCRIPT_DIR_ENV="$SCRIPT_DIR" python3 - <<'PY'
import json, time, os, subprocess
from pathlib import Path

script_dir = Path(os.environ.get('SCRIPT_DIR_ENV', '.'))
tasks_path = script_dir / 'tasks.json'
state_path = script_dir / 'state.json'
runtime_path = script_dir / '.runtime_progress.json'
live_ops_path = script_dir / '.live_ops.jsonl'
backup_tasks_path = script_dir / '.tasks.backup.json'

# strict mode: progress is reported from explicit task updates, not wall-clock simulation
PROGRESS_SPEED = 0.0

now = time.time()

parse_ok = True
try:
    raw = json.loads(tasks_path.read_text())
except Exception:
    parse_ok = False
    raw = {"tasks": []}

# safety net: if tasks file is empty/corrupted, recover from last good backup
if (not raw.get('tasks')) and backup_tasks_path.exists():
    try:
        backup = json.loads(backup_tasks_path.read_text())
        if backup.get('tasks'):
            raw = backup
    except Exception:
        pass

try:
    runtime = json.loads(runtime_path.read_text())
except Exception:
    runtime = {"nodes": {}, "meta": {}, "completed": [], "recentTasks": []}

nodes_db = runtime.setdefault('nodes', {})
meta_db = runtime.setdefault('meta', {})
completed = runtime.setdefault('completed', [])
recent_tasks = runtime.setdefault('recentTasks', [])

def key_for(task_id, path):
    return f"{task_id}:{'.'.join(map(str, path))}"

def walk(node, task_id, path):
    children = node.get('subtasks', [])
    est = float(node.get('estimate', 0) or 0)
    actual = float(node.get('actual', 0) or 0)
    status = node.get('status', 'todo')

    k = key_for(task_id, path)
    rec = nodes_db.get(k, {'actual': actual, 'last': now})
    prev_actual = float(rec.get('actual', actual) or 0)
    last = float(rec.get('last', now) or now)
    elapsed_min = max(0.0, (now - last) / 60.0) * PROGRESS_SPEED
    prev_meta = meta_db.get(k, {})
    prev_status_local = prev_meta.get('status')
    since = float(prev_meta.get('since', now) or now)

    if children:
        child_out = []
        for i, c in enumerate(children):
            child_out.append(walk(c, task_id, path + [i]))
        node['subtasks'] = child_out

        all_done = all(c.get('status') == 'done' for c in child_out)
        any_doing = any(c.get('status') == 'doing' for c in child_out)
        any_todo = any(c.get('status') == 'todo' for c in child_out)

        if all_done:
            status = 'done'
        elif any_doing:
            status = 'doing'
        elif any_todo:
            status = 'todo'

        child_est = sum(float(c.get('estimate', 0) or 0) for c in child_out)
        child_actual = sum(float(c.get('actual', 0) or 0) for c in child_out)
        if est <= 0:
            est = child_est
        actual = child_actual
    else:
        if status == 'doing' and est > 0:
            # smooth real-time progress from status start (no random jumps)
            effective_since = now if prev_status_local != 'doing' else float(since or now)
            started_actual = float(prev_meta.get('startedActual', actual if prev_status_local != 'doing' else prev_actual) or 0)
            elapsed_from_start_min = max(0.0, (now - effective_since) / 60.0) * PROGRESS_SPEED
            time_based_actual = started_actual + elapsed_from_start_min
            # manual updates can only move progress forward
            actual = max(actual, time_based_actual)
            actual = max(0.0, min(est, actual))
        elif status == 'done' and est > 0:
            actual = max(prev_actual, est)
        else:
            # for todo/other states do not keep stale carried value
            actual = max(0.0, min(est, actual)) if est > 0 else max(0.0, actual)

    progress = 0 if est <= 0 else round(max(0, min(100, (actual / est) * 100)), 1)
    # hard rule: 100% means done (prevents "doing 100%" stale state)
    if est > 0 and actual >= est:
        status = 'done'
        progress = 100
    elif status == 'done':
        progress = 100

    node['estimate'] = round(est, 2) if est else 0
    node['actual'] = round(actual, 2)
    node['progress'] = progress
    node['status'] = status

    prev_status = meta_db.get(k, {}).get('status')
    if prev_status != 'done' and status == 'done' and len(path) > 0:
        completed.append({
            'id': task_id,
            'path': path,
            'title': node.get('title', ''),
            'ts': now
        })

    prev_meta = meta_db.get(k, {})
    since = prev_meta.get('since', now)
    prev_status = prev_meta.get('status')
    prev_progress = float(prev_meta.get('progress', progress) or 0)
    prev_ts = float(prev_meta.get('ts', now) or now)

    # reset timer anchor only when status changes (start of step)
    started_actual = float(prev_meta.get('startedActual', prev_actual) or 0)
    if prev_status != status:
        since = now
        started_actual = float(node.get('actual', 0) or 0)

    # online speed estimate (progress points per second), smoothed
    dt = max(0.001, now - prev_ts)
    dp = float(progress) - prev_progress
    inst_rate = max(0.0, dp / dt)
    old_rate = float(prev_meta.get('rate', 0.0) or 0.0)
    alpha = 0.45
    rate = inst_rate if old_rate <= 0 else (alpha * inst_rate + (1 - alpha) * old_rate)

    meta_db[k] = {
        'status': status,
        'progress': progress,
        'title': node.get('title', ''),
        'since': since,
        'startedActual': started_actual,
        'ts': now,
        'rate': rate
    }
    nodes_db[k] = {'actual': node['actual'], 'last': now}
    return node

root_tasks = raw.get('tasks', [])
out_tasks = []
for t in root_tasks:
    task_id = t.get('id', 'TASK')
    out_tasks.append(walk(t, task_id, []))

# If a task is still doing but has no active leaf, auto-start next todo leaf.
def has_doing_leaf(node):
    subs = node.get('subtasks') or []
    if not subs:
        return node.get('status') == 'doing'
    return any(has_doing_leaf(s) for s in subs)

def start_first_todo_leaf(node):
    subs = node.get('subtasks') or []
    if not subs:
        if node.get('status') == 'todo':
            node['status'] = 'doing'
            node['progress'] = max(float(node.get('progress', 0) or 0), 0.1)
            node['actual'] = max(float(node.get('actual', 0) or 0), 0.01)
            return True
        return False
    for s in subs:
        if start_first_todo_leaf(s):
            return True
    return False

# Strict status mode: do not auto-start todo leaves.
# If there is no explicit "doing" step, board stays idle until status is updated by real work.

# strict mode: do not rewrite tasks.json automatically.
# tasks.json is source-of-truth and must be changed explicitly by real work updates.
if out_tasks:
    try:
        backup_tasks_path.write_text(json.dumps({'tasks': out_tasks}, ensure_ascii=False, indent=2))
    except Exception:
        pass

# track completed TOP-LEVEL tasks history (latest 20)
for t in out_tasks:
    task_id = t.get('id', 'TASK')
    task_key = f"task:{task_id}"
    prev = meta_db.get(task_key, {}).get('status')
    cur = t.get('status', 'todo')
    if prev != 'done' and cur == 'done':
        recent_tasks.append({
            'id': task_id,
            'title': t.get('title', 'task'),
            'ts': now,
            'task': t
        })
    meta_db[task_key] = {'status': cur}

# keep last 200 step entries persisted
completed = sorted(completed, key=lambda x: x.get('ts', 0))[-200:]
runtime['completed'] = completed
# keep last 20 tasks persisted always
recent_tasks = sorted(recent_tasks, key=lambda x: x.get('ts', 0))[-20:]
runtime['recentTasks'] = recent_tasks

# Collect leaf steps for full visualization
current_steps = []
active_steps = []

def collect_steps(task_id, nodes, path=None):
    path = path or []
    for idx, n in enumerate(nodes or []):
        subt = n.get('subtasks') or []
        p = path + [idx]
        if subt:
            collect_steps(task_id, subt, p)
        else:
            key = key_for(task_id, p)
            since = meta_db.get(key, {}).get('since', now)
            estimate = float(n.get('estimate', 0) or 0)
            actual = float(n.get('actual', 0) or 0)
            planned_total_sec = estimate * 60.0 if estimate > 0 else 0.0
            elapsed_sec = max(0.0, now - float(since or now))
            key = key_for(task_id, p)
            rate = float(meta_db.get(key, {}).get('rate', 0.0) or 0.0)
            prog = float(n.get('progress', 0) or 0)

            if n.get('status') == 'doing':
                rem_plan = max(0.0, (estimate - actual) * 60.0) if estimate > 0 else 0.0

                rem_proj = None
                if prog >= 5 and elapsed_sec > 0:
                    total_proj = elapsed_sec / max(0.05, (prog / 100.0))
                    rem_proj = max(0.0, total_proj - elapsed_sec)
                    # prevent absurd ETA blow-ups at low confidence
                    if rem_plan > 0:
                        rem_proj = min(rem_proj, rem_plan * 3.0)

                rem_rate = None
                if rate > 0 and prog >= 10 and prog < 100:
                    rem_rate = max(0.0, (100.0 - prog) / rate)
                    if rem_plan > 0:
                        rem_rate = min(rem_rate, rem_plan * 3.0)

                cands = [x for x in [rem_plan, rem_proj, rem_rate] if x is not None]
                if cands:
                    cands = sorted(cands)
                    remaining_sec = cands[len(cands)//2]
                else:
                    remaining_sec = rem_plan
            else:
                remaining_sec = max(0.0, (estimate - actual) * 60.0) if estimate > 0 else 0.0

            # confidence of ETA quality
            conf = 'low'
            if prog >= 20 and elapsed_sec >= 120:
                conf = 'medium'
            if prog >= 45 and elapsed_sec >= 300 and rate > 0:
                conf = 'high'

            item = {
                'id': task_id,
                'title': n.get('title', 'step'),
                'status': n.get('status', 'todo'),
                'progress': n.get('progress', 0),
                'since': since,
                'estimate': estimate,
                'actual': actual,
                'remainingSec': remaining_sec,
                'elapsedSec': elapsed_sec,
                'rate': rate,
                'etaConfidence': conf
            }
            if item['status'] == 'doing':
                current_steps.append(item)
            if item['status'] != 'done':
                active_steps.append(item)

for t in out_tasks:
    collect_steps(t.get('id', 'TASK'), t.get('subtasks', []), [])

try:
    runtime_path.write_text(json.dumps(runtime, ensure_ascii=False))
except Exception:
    pass

cpu = '0.00'
try:
    out = subprocess.check_output("ps -C openclaw-gateway -o %cpu= 2>/dev/null", shell=True, text=True).strip().splitlines()
    cpu = f"{sum(float(x.strip() or 0) for x in out):.2f}"
except Exception:
    pass

load1 = 0.0
try:
    load1 = float(Path('/proc/loadavg').read_text().split()[0])
except Exception:
    pass

recent_done = completed[-20:][::-1]
last_done = recent_done[0] if recent_done else None

live_ops = []
try:
    if live_ops_path.exists():
        lines = live_ops_path.read_text().splitlines()[-200:]
        for ln in lines:
            ln = ln.strip()
            if not ln:
                continue
            try:
                live_ops.append(json.loads(ln))
            except Exception:
                pass
except Exception:
    pass

payload = {
  'timestamp': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(now)),
  'nowTs': now,
  'gatewayUp': True,
  'gatewayCpu': float(cpu),
  'recentCmds': 0,
  'load1': load1,
  'mode': 'working',
  'currentSteps': current_steps,
  'activeSteps': active_steps,
  'recentDone': recent_done,
  'recentTasks': recent_tasks[::-1],
  'liveOps': live_ops[::-1][:40],
  'lastDoneStep': last_done,
  'taskState': {'tasks': out_tasks}
}

try:
    state_path.write_text(json.dumps(payload, ensure_ascii=False))
except Exception:
    pass
print('ok')
PY

# Keep served files in sync with workspace source-of-truth
if [ -d /var/www/office ]; then
  cp "$SCRIPT_DIR/tasks.json" /var/www/office/tasks.json || true
  cp "$SCRIPT_DIR/state.json" /var/www/office/state.json || true
fi
