#!/usr/bin/env bash
set -euo pipefail

ROOT="/home/antonbot/.openclaw/workspace"
SHARED="/home/antonbot/.openclaw/shared"
LOG="$SHARED/NIGHT_PIPELINE_LOG.md"

cat > "$LOG" <<'EOF'
# NIGHT PIPELINE LOG
Started: $(date -u)
EOF

run_agent() {
  local agent="$1"
  local msg="$2"
  echo "[$(date -u +%FT%TZ)] RUN $agent" | tee -a "$LOG"
  openclaw agent --agent "$agent" --message "$msg" --deliver
}

check_approved() {
  grep -Eiq "APPROVED" "$SHARED/VISUAL_REVIEW.md"
}

TASKS=(
"ЗАДАЧА 1 — Освещение: сделай сцену яркой и тёплой как на референсе. RenderSettings.ambientLight = new Color(1.0f, 0.88f, 0.65f), добавь directional light с тёплым цветом и intensity 1.2. Никаких тёмных углов."
"ЗАДАЧА 2 — Room 2: дверной проём должен быть виден в правом верхнем углу. Room2FrameOuter Z=8.7, Room2Inner Z=8.75, Room2TopGlow Z=8.65, Room2LeftGlow Z=8.65, Room2RightGlow Z=8.65, Room2Arrow Z=8.6, Room2Lbl Z=8.6. X позиция 6.6 не трогать."
"ЗАДАЧА 3 — Зоны: dispatch зона слева должна иметь яркое оранжевое свечение на полу, monitoring зона справа — яркое зелёное. Увеличь intensity эмиссии обоих зон в 2 раза."
"ЗАДАЧА 4 — Роботы: увеличь всех 4 роботов до scale(1.0, 1.0, 1.0) если они меньше. Добавь яркое свечение глаз (emission intensity 3.0)."
"ЗАДАЧА 5 — Task board: карточки на доске должны быть яркими и хорошо читаемыми. Увеличь размер и яркость карточек."
)

idx=1
for task in "${TASKS[@]}"; do
  approved=0
  echo -e "\n## TASK $idx\n$task" >> "$LOG"

  for iter in 1 2 3; do
    echo "[$(date -u +%FT%TZ)] TASK $idx ITER $iter START" | tee -a "$LOG"

    run_agent planner "Текущий пункт: $task\nИтерация: $iter/3. Подготовь план в $SHARED/PLAN.md"
    run_agent worker "Прочитай $SHARED/PLAN.md и выполни план по пункту: $task. Внеси изменения, commit+push, обнови $SHARED/WORKER_STATUS.md"
    run_agent builder "Прочитай $SHARED/WORKER_STATUS.md и выполни build/deploy cycle до screenshot. Обнови $SHARED/BUILD_STATUS.md"
    run_agent reviewer "Прочитай $SHARED/WORKER_STATUS.md и $SHARED/BUILD_STATUS.md. Запиши вердикт в $SHARED/REVIEW.md"
    run_agent vreviewer "Прочитай $SHARED/BUILD_STATUS.md и $SHARED/REVIEW.md. Проведи визуальную проверку по референсу и запиши вердикт в $SHARED/VISUAL_REVIEW.md"

    if check_approved; then
      approved=1
      echo "[$(date -u +%FT%TZ)] TASK $idx ITER $iter APPROVED" | tee -a "$LOG"
      break
    else
      echo "[$(date -u +%FT%TZ)] TASK $idx ITER $iter CHANGES_REQUESTED" | tee -a "$LOG"
    fi
  done

  if [[ $approved -ne 1 ]]; then
    echo "[$(date -u +%FT%TZ)] TASK $idx reached max iterations (3), moving next" | tee -a "$LOG"
  fi

  idx=$((idx+1))
done

echo "[$(date -u +%FT%TZ)] NIGHT PIPELINE FINISHED" | tee -a "$LOG"
