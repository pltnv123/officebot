#!/usr/bin/env bash
set -euo pipefail

SHARED="/home/antonbot/.openclaw/shared"
REF="/home/antonbot/.openclaw/workspace-vreviewer/reference.jpg"
LOG="$SHARED/VISUAL_REF_LOOP.md"

cat > "$LOG" <<LOG
# VISUAL REFERENCE LOOP
Started: $(date -u +%F' '%T' UTC)
Reference: $REF
LOG

for i in 1 2 3 4 5; do
  echo "\n## Iteration $i" >> "$LOG"

  cat > "$SHARED/PIPELINE.md" <<P
# PIPELINE.md — Current task state
Last updated: $(date -u +%F' '%T' UTC)

## Status
PLANNING

## Current task
VISUAL ALIGNMENT vs reference.jpg (iteration $i/5)
P

  openclaw agent --agent planner --message "Итерация $i/5. Изучи референс $REF и текущий скриншот/BUILD_STATUS. Составь конкретный план визуальных правок в /home/antonbot/.openclaw/shared/PLAN.md" --deliver

  cat > "$SHARED/PIPELINE.md" <<P
# PIPELINE.md — Current task state
Last updated: $(date -u +%F' '%T' UTC)

## Status
WORKING

## Current task
VISUAL ALIGNMENT vs reference.jpg (iteration $i/5)
P

  openclaw agent --agent worker --message "Итерация $i/5. Прочитай /home/antonbot/.openclaw/shared/PLAN.md и реализуй правки в RuntimeSceneBuilder.cs для максимального совпадения с $REF. Commit+push. Запиши в /home/antonbot/.openclaw/shared/WORKER_STATUS.md" --deliver

  cat > "$SHARED/PIPELINE.md" <<P
# PIPELINE.md — Current task state
Last updated: $(date -u +%F' '%T' UTC)

## Status
BUILDING

## Current task
VISUAL ALIGNMENT vs reference.jpg (iteration $i/5)
P

  openclaw agent --agent builder --message "Итерация $i/5. Прочитай /home/antonbot/.openclaw/shared/WORKER_STATUS.md, выполни deploy cycle до CI green, проверь WASM, сделай скриншот и отправь в Telegram, обнови /home/antonbot/.openclaw/shared/BUILD_STATUS.md" --deliver

  cat > "$SHARED/PIPELINE.md" <<P
# PIPELINE.md — Current task state
Last updated: $(date -u +%F' '%T' UTC)

## Status
VREVIEWING

## Current task
VISUAL ALIGNMENT vs reference.jpg (iteration $i/5)
P

  openclaw agent --agent vreviewer --message "Итерация $i/5. Сравни последний скриншот из BUILD_STATUS с референсом $REF. Запиши конкретный список отличий и вердикт APPROVED/CHANGES_REQUESTED в /home/antonbot/.openclaw/shared/VISUAL_REVIEW.md" --deliver

  if grep -Eiq "APPROVED" /home/antonbot/.openclaw/shared/VISUAL_REVIEW.md; then
    echo "APPROVED on iteration $i" >> "$LOG"
    cat > "$SHARED/PIPELINE.md" <<P
# PIPELINE.md — Current task state
Last updated: $(date -u +%F' '%T' UTC)

## Status
DONE

## Current task
VISUAL ALIGNMENT APPROVED (iteration $i)
P
    exit 0
  fi

  echo "CHANGES_REQUESTED on iteration $i" >> "$LOG"
done

cat > "$SHARED/PIPELINE.md" <<P
# PIPELINE.md — Current task state
Last updated: $(date -u +%F' '%T' UTC)

## Status
DONE

## Current task
VISUAL ALIGNMENT finished at max iterations (5), not approved
P
