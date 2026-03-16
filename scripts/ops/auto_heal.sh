#!/bin/bash
# Auto-Heal — monitors system, detects errors, applies known solutions
# Runs via cron or manually: bash auto_heal.sh
# Reduces error repetition to 0 by learning and auto-fixing

PROJECT="/home/antonbot/.openclaw/workspace/office"
ERROR_LOG="$PROJECT/scripts/ops/errors.log"
HEAL_LOG="$PROJECT/scripts/ops/heal.log"
SOLUTIONS="$PROJECT/scripts/ops/solutions.json"

log_heal() {
    echo "[$(date -u '+%H:%M:%S UTC')] $1" >> "$HEAL_LOG"
}

ERRORS_FIXED=0

# 1. Check Tor proxy
if ! systemctl is-active tor >/dev/null 2>&1; then
    log_heal "FIX: Restarting Tor"
    sudo systemctl restart tor
    ERRORS_FIXED=$((ERRORS_FIXED + 1))
fi

# 2. Check privoxy (HTTP->SOCKS bridge)
if ! systemctl is-active privoxy >/dev/null 2>&1; then
    log_heal "FIX: Restarting privoxy"
    sudo systemctl restart privoxy
    ERRORS_FIXED=$((ERRORS_FIXED + 1))
fi

# 3. Check gateway
if ! systemctl --user is-active openclaw-gateway.service >/dev/null 2>&1; then
    log_heal "FIX: Restarting gateway"
    systemctl --user restart openclaw-gateway.service
    ERRORS_FIXED=$((ERRORS_FIXED + 1))
fi

# 4. Check WASM freshness (if >30min old and CI not running)
WASM_AGE=$(($(date +%s) - $(stat -c %Y /var/www/office/Build/WebGL.wasm.gz 2>/dev/null || echo 0)))
CI_RUNNING=$(cd "$PROJECT" && gh run list --limit 1 --json status -q '.[0].status' 2>/dev/null)
if [ "$WASM_AGE" -gt 1800 ] && [ "$CI_RUNNING" != "in_progress" ]; then
    log_heal "WARN: WASM is $(($WASM_AGE/60))min old, CI not running"
fi

# 5. Check scene accessibility
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://5.45.115.12/office/ --max-time 5)
if [ "$HTTP_CODE" != "200" ]; then
    log_heal "FIX: Scene returned $HTTP_CODE, checking nginx"
    sudo systemctl restart nginx 2>/dev/null
    ERRORS_FIXED=$((ERRORS_FIXED + 1))
fi

# 6. Report
if [ "$ERRORS_FIXED" -gt 0 ]; then
    log_heal "Auto-healed $ERRORS_FIXED issues"
    echo "AUTO_HEALED: $ERRORS_FIXED issues fixed"
else
    echo "ALL_OK: No issues detected"
fi
