#!/usr/bin/env bash
set -euo pipefail
SHARED="/home/antonbot/.openclaw/shared"
REF="/home/antonbot/.openclaw/workspace-vreviewer/reference.jpg"
LOG="$SHARED/AUTOCYCLE_9_LOG.md"

echo "# AUTOCYCLE to 9/10" > "$LOG"
echo "Started: $(date -u +%F' '%T' UTC)" >> "$LOG"

iter=0
while true; do
  iter=$((iter+1))
  echo "\n## Iteration $iter" >> "$LOG"

  openclaw agent --agent worker --message "Итерация $iter. Прочитай /home/antonbot/.openclaw/shared/VISUAL_REVIEW.md и внеси правки в RuntimeSceneBuilder.cs. Сделай локальный commit без push. Обнови /home/antonbot/.openclaw/shared/WORKER_STATUS.md" --deliver

  openclaw agent --agent reviewer --message "Итерация $iter. Проверь локальные изменения из /home/antonbot/.openclaw/shared/WORKER_STATUS.md. Вердикт в /home/antonbot/.openclaw/shared/REVIEW.md (APPROVED/CHANGES_REQUESTED)." --deliver

  if ! grep -Eiq 'APPROVED' "$SHARED/REVIEW.md"; then
    echo "Reviewer CHANGES_REQUESTED" >> "$LOG"
    continue
  fi

  openclaw agent --agent worker --message "Reviewer APPROVED. Выполни push последнего локального commit и обнови /home/antonbot/.openclaw/shared/WORKER_STATUS.md" --deliver

  openclaw agent --agent builder --message "Итерация $iter. Прочитай /home/antonbot/.openclaw/shared/WORKER_STATUS.md, выполни deploy до CI green, сделай screenshot и отправь в Telegram. Обнови /home/antonbot/.openclaw/shared/BUILD_STATUS.md" --deliver

  openclaw agent --agent vreviewer --message "Итерация $iter. Сравни новый screenshot из BUILD_STATUS с $REF. Запиши в /home/antonbot/.openclaw/shared/VISUAL_REVIEW.md: Score: X/10 + список правок." --deliver

  score=$(grep -Eo 'Score:[[:space:]]*[0-9]+(\.[0-9]+)?/10' "$SHARED/VISUAL_REVIEW.md" | tail -1 | sed -E 's/.*Score:[[:space:]]*([0-9]+(\.[0-9]+)?)\/10/\1/' || true)
  echo "Score=${score:-NA}" >> "$LOG"
  if [[ -n "${score:-}" ]] && awk -v s="$score" 'BEGIN{exit !(s>=9)}'; then
    echo "Reached score >=9/10" >> "$LOG"
    break
  fi

done
