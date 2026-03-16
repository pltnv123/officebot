#!/usr/bin/env bash
set -euo pipefail

ROOT="/home/antonbot/.openclaw/workspace"
SHARED="/home/antonbot/.openclaw/shared"
REF="/home/antonbot/.openclaw/workspace-vreviewer/reference.jpg"
LOG="$SHARED/REFERENCE_PIPELINE_LOG.md"

mkdir -p "$SHARED"

cat > "$LOG" <<EOF
# REFERENCE AUTO PIPELINE
Started: $(date -u +%F' '%T' UTC')
Reference: $REF
EOF

run_agent() {
  local agent="$1"
  local msg="$2"
  echo "[$(date -u +%FT%TZ)] RUN $agent" | tee -a "$LOG"
  openclaw agent --agent "$agent" --message "$msg" --deliver
}

is_approved() {
  grep -Eiq "APPROVED" "$SHARED/VISUAL_REVIEW.md"
}

for iter in 1 2 3 4 5; do
  echo -e "\n## ITERATION $iter" | tee -a "$LOG"

  run_agent planner "Итерация $iter/5. Цель: максимально приблизить сцену к референсу $REF. Составь план на текущую итерацию в $SHARED/PLAN.md на основе предыдущего VISUAL_REVIEW.md (если есть)."

  run_agent worker "Итерация $iter/5. Прочитай $SHARED/PLAN.md и внеси изменения в проект для максимального визуального соответствия референсу $REF. Сделай commit+push. Запиши доказательства в $SHARED/WORKER_STATUS.md."

  run_agent builder "Итерация $iter/5. Прочитай $SHARED/WORKER_STATUS.md. Выполни полный build/deploy cycle, дождись CI green, проверь WASM, сделай НОВЫЙ скриншот и отправь его в Telegram. Обнови $SHARED/BUILD_STATUS.md."

  run_agent reviewer "Итерация $iter/5. Прочитай $SHARED/WORKER_STATUS.md и $SHARED/BUILD_STATUS.md, проверь корректность изменений и запиши вердикт в $SHARED/REVIEW.md."

  run_agent vreviewer "Итерация $iter/5. Сравни новый скриншот из BUILD_STATUS.md с референсом $REF. Дай точный список расхождений и вердикт APPROVED/CHANGES_REQUESTED в $SHARED/VISUAL_REVIEW.md."

  if is_approved; then
    echo "[$(date -u +%FT%TZ)] APPROVED on iteration $iter" | tee -a "$LOG"
    exit 0
  fi

  echo "[$(date -u +%FT%TZ)] CHANGES_REQUESTED on iteration $iter" | tee -a "$LOG"
done

echo "[$(date -u +%FT%TZ)] Max iterations reached (5), final status: CHANGES_REQUESTED" | tee -a "$LOG"
exit 0
