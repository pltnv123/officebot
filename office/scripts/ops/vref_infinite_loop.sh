#!/usr/bin/env bash
set -euo pipefail
SHARED="/home/antonbot/.openclaw/shared"
REF="/home/antonbot/.openclaw/workspace-vreviewer/reference.jpg"
LOG="$SHARED/VREF_INFINITE_LOOP.md"

mkdir -p "$SHARED"
echo "# VREF LOOP started $(date -u +%F' '%T' UTC)" >> "$LOG"

iter=0
while true; do
  iter=$((iter+1))
  echo "\n## Iteration $iter $(date -u +%FT%TZ)" >> "$LOG"

  openclaw agent --agent vreviewer --message "Итерация $iter. Сравни /tmp/scene_screenshot.png и $REF. Выдай конкретный список правок для RuntimeSceneBuilder.cs и numeric score X/10 в /home/antonbot/.openclaw/shared/VISUAL_REVIEW.md" --deliver

  if grep -Eqi '([9]|10)\s*/\s*10|score\s*[:=]\s*(9|10)' "$SHARED/VISUAL_REVIEW.md"; then
    echo "Reached target score >=9/10 at iteration $iter" >> "$LOG"
    break
  fi

  openclaw agent --agent worker --message "Итерация $iter. Прочитай /home/antonbot/.openclaw/shared/VISUAL_REVIEW.md и реализуй ВСЕ конкретные правки в RuntimeSceneBuilder.cs. Затем commit+push и отчёт в /home/antonbot/.openclaw/shared/WORKER_STATUS.md" --deliver

  openclaw agent --agent builder --message "Итерация $iter. Прочитай /home/antonbot/.openclaw/shared/WORKER_STATUS.md. Выполни deploy cycle: CI green, wasm check, новый screenshot, отправка screenshot в Telegram, отчёт в /home/antonbot/.openclaw/shared/BUILD_STATUS.md" --deliver

done
