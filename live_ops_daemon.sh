#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR=$(cd -- "$(dirname "$0")" >/dev/null 2>&1 && pwd)
STATE="$SCRIPT_DIR/state.json"
LOG_OP="$SCRIPT_DIR/log_op.sh"
PIDFILE="$SCRIPT_DIR/.live_ops_daemon.pid"

echo $$ > "$PIDFILE"
trap 'rm -f "$PIDFILE"' EXIT

phrase_for() {
  local p="$1"
  if (( p < 20 )); then echo "думаю и раскладываю план";
  elif (( p < 40 )); then echo "выполняю основной шаг";
  elif (( p < 60 )); then echo "почти доделал текущий блок";
  elif (( p < 80 )); then echo "исправляю ошибки и полирую";
  else echo "финализирую и проверяю результат"; fi
}

while true; do
  if [[ -f "$STATE" ]]; then
    python3 - <<'PY' "$STATE" "$LOG_OP"
import json,sys,subprocess
state_path,log_op=sys.argv[1:3]
try:
    d=json.load(open(state_path,'r',encoding='utf-8'))
except Exception:
    raise SystemExit(0)
cur=d.get('currentSteps') or []
for step in cur[:3]:
    title=f"{step.get('id','TASK')} / {step.get('title','step')}"
    p=int(float(step.get('progress',0) or 0))
    if p < 20: msg='думаю и раскладываю план'
    elif p < 40: msg='выполняю основной шаг'
    elif p < 60: msg='почти доделал текущий блок'
    elif p < 80: msg='исправляю ошибки и полирую'
    else: msg='финализирую и проверяю результат'
    subprocess.run([log_op,'now',title,msg,'running'],check=False)
PY
  fi
  sleep 45
done
