#!/bin/bash
# Autoloop — triggers real work cycle, not a reminder message
BOT_TOKEN=$(node -e "const d=require('/home/antonbot/.openclaw/openclaw.json');console.log(d.channels.telegram.botToken)")
MSG="AUTOLOOP TRIGGER $(date -u +%H:%M UTC). Execute ALGORITHM.md WAKE-UP SEQUENCE now. Run all exec commands. Check visual conditions. Take next ACTIVE task from BACKLOG. Send screenshot after any deploy. No template responses — only real output."
curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
 -d "chat_id=6540715349" \
 -d "text=${MSG}" > /dev/null
