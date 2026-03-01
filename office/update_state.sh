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

# Speed multiplier: 1.0 = real-time, >1 faster execution
PROGRESS_SPEED = 6.0

now = time.time()

try:
    raw = json.loads(tasks_path.read_text())
except Exception:
    raw = {"tasks": []}

try:
    runtime = json.loads(runtime_path.read_text())
except Exception:
    runtime = {"nodes": {}}

nodes_db = runtime.setdefault('nodes', {})

def key_for(task_id, path):
    return f"{task_id}:{'.'.join(map(str, path))}"

def auto_pick_doing(children):
    """If nothing is doing and there are todos, pick first todo as doing."""
    if not children:
        return
    has_doing = any(c.get('status') == 'doing' for c in children)
    if has_doing:
        return
    for c in children:
        if c.get('status') == 'todo':
            c['status'] = 'doing'
            break

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

    if children:
        # auto workflow inside subtree: pick next todo when no active child
        auto_pick_doing(children)

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
            actual = min(est, prev_actual + elapsed_min)
            if actual >= est:
                status = 'done'
        elif status == 'done' and est > 0:
            actual = max(prev_actual, est)
        else:
            actual = max(prev_actual, actual)

    progress = 0 if est <= 0 else round(max(0, min(100, (actual / est) * 100)), 1)
    if status == 'done':
        progress = 100

    node['estimate'] = round(est, 2) if est else 0
    node['actual'] = round(actual, 2)
    node['progress'] = progress
    node['status'] = status

    nodes_db[k] = {'actual': node['actual'], 'last': now}
    return node

# top-level auto-pick: if nothing active, start first todo task
root_tasks = raw.get('tasks', [])
if root_tasks:
    has_top_doing = any(t.get('status') == 'doing' for t in root_tasks)
    if not has_top_doing:
        for t in root_tasks:
            if t.get('status') == 'todo':
                t['status'] = 'doing'
                break

out_tasks = []
for t in root_tasks:
    task_id = t.get('id', 'TASK')
    out_tasks.append(walk(t, task_id, []))

# persist progress/state so reload does not reset (best-effort)
try:
    runtime_path.write_text(json.dumps(runtime, ensure_ascii=False))
except Exception:
    pass

try:
    raw['tasks'] = out_tasks
    tasks_path.write_text(json.dumps(raw, ensure_ascii=False, indent=2))
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

payload = {
  'timestamp': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(now)),
  'gatewayUp': True,
  'gatewayCpu': float(cpu),
  'recentCmds': 0,
  'load1': load1,
  'mode': 'working',
  'taskState': {'tasks': out_tasks}
}
try:
    state_path.write_text(json.dumps(payload, ensure_ascii=False))
except Exception:
    # if direct write blocked, at least avoid crash
    pass
print('ok')
PY
