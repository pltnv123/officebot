#!/bin/bash
# Model Manager - оптимизация использования нейросетей
# Стратегия: paid для кода, free для всего остального

LOG="/home/antonbot/.openclaw/workspace/office/scripts/ops/model_usage.log"
STATS="/home/antonbot/.openclaw/workspace/office/scripts/ops/model_stats.json"

log() { echo "[$(date -u '+%H:%M:%S')] $1" >> "$LOG"; }

# Текущие лимиты (обновлять по auth-profiles.json)
# openai-codex:default - ~1 час
# openai-codex:account2 - ~1 час  
# openrouter/hunter-alpha - unlimited (free)
# openrouter/free - unlimited (free)

check_models() {
    local hour=$(date -u '+%H')
    
    if [ $hour -ge 8 ] && [ $hour -lt 12 ]; then
        echo "PEAK: paid models для кода, free для чата"
        export CODE_MODEL="openai-codex:default"
        export CHAT_MODEL="openrouter/hunter-alpha"
    elif [ $hour -ge 12 ] && [ $hour -lt 18 ]; then
        echo "MID: чередование paid/free"
        export CODE_MODEL="openai-codex:account2"
        export CHAT_MODEL="openrouter/hunter-alpha"
    else
        echo "LOW: free models для всего"
        export CODE_MODEL="openrouter/hunter-alpha"
        export CHAT_MODEL="openrouter/free"
    fi
    
    log "Models selected: CODE=$CODE_MODEL CHAT=$CHAT_MODEL"
}

case "$1" in
    check) check_models ;;
    log) log "$2" ;;
    *) echo "Usage: $0 check|log 'message'" ;;
esac
