#!/usr/bin/env bash
set -euo pipefail
SHARED="/home/antonbot/.openclaw/shared"
REF="/home/antonbot/.openclaw/workspace-vreviewer/reference.jpg"
LOG="$SHARED/VREF_FIX_LOOP.md"

echo "# VREF FIX LOOP $(date -u +%F' '%T' UTC)" > "$LOG"
iter=0
while true; do
  iter=$((iter+1))
  echo "\n## ITER $iter $(date -u +%FT%TZ)" | tee -a "$LOG"

  openclaw agent --agent worker --message "Итерация $iter. Реализуй ВСЕ 5 пунктов в RuntimeSceneBuilder.cs строго: 
1) ОСВЕЩЕНИЕ: RenderSettings.ambientLight = new Color(1.2f, 0.95f, 0.72f). Добавь второй fill light снизу intensity=0.4 color new Color(0.8f, 0.6f, 0.4f). Убери тёмные углы.
2) MONITORING WALL: справа у стены (pos 7,0,3) 3 монитора-куба size (1.4f,1.0f,0.1f), зазор 0.2f, emission зелёный Color(0,0.8f,0.2f) intensity=2.0. Добавь стол перед ними (2f,0.5f,0.8f) тёмно-серый.
3) MAIN DESK PROPS: на стол 3-4 мелких куба (0.15f): ноутбук серый, лампа жёлтая, бумаги белые.
4) TASK BOARD: увеличь board до (5f,2.5f,0.1f). В каждой из 6 колонок по 3 карточки (0.3f x 0.2f), яркие цвета: жёлтый/оранжевый/синий/фиолетовый.
5) ПОЛ И ДЕКОР: маршрут — серия кубиков (0.15f x 0.04f x 0.15f) шаг 0.4f вдоль путей. Добавь 4 растения по углам: цилиндр зелёный (0.3f,0.8f,0.3f).
После выполнения commit+push и обнови /home/antonbot/.openclaw/shared/WORKER_STATUS.md" --deliver

  openclaw agent --agent builder --message "Итерация $iter. Прочитай /home/antonbot/.openclaw/shared/WORKER_STATUS.md. Сделай deploy cycle: CI green, wasm check, новый screenshot и отправка в Telegram, запиши всё в /home/antonbot/.openclaw/shared/BUILD_STATUS.md" --deliver

  openclaw agent --agent vreviewer --message "Итерация $iter. Сравни последний screenshot из BUILD_STATUS с $REF. Дай конкретные отличия + обязательную строку 'Score: X/10' и вердикт APPROVED/CHANGES_REQUESTED в /home/antonbot/.openclaw/shared/VISUAL_REVIEW.md" --deliver

  score=$(grep -Eo 'Score:[[:space:]]*[0-9]+(\.[0-9]+)?/10' "$SHARED/VISUAL_REVIEW.md" | tail -1 | sed -E 's/.*Score:[[:space:]]*([0-9]+(\.[0-9]+)?)\/10/\1/' || true)
  if [[ -z "${score:-}" ]]; then
    echo "No score found, continue" | tee -a "$LOG"
    continue
  fi
  echo "Score=$score" | tee -a "$LOG"
  awk -v s="$score" 'BEGIN{exit !(s>=9)}' && { echo "Reached >=9/10" | tee -a "$LOG"; break; }
done
