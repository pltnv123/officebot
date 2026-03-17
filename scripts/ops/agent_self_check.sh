#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Agent Self-Check — Автоматическая проверка системы
# Основано на методологиях: SRE, Code Reviewer, Security, 
#   Incident Commander, API Tester, Architect, PM
# ═══════════════════════════════════════════════════════════════

# set -euo pipefail removed for resilience — each section handles its own errors

PROJECT="/home/antonbot/.openclaw/workspace/office"
REPORT="/tmp/agent_self_check_$(date -u +%Y%m%d_%H%M%S).txt"
ERROR_LOG="$PROJECT/scripts/ops/errors.log"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Счётчики
PASS=0
WARN=0
FAIL=0

# Режимы (по умолчанию: все)
MODE_ALL=true
MODE_SECURITY=false
MODE_CI=false
MODE_ARCH=false
MODE_TESTS=false

for arg in "$@"; do
    case $arg in
        --security) MODE_ALL=false; MODE_SECURITY=true ;;
        --ci)       MODE_ALL=false; MODE_CI=true ;;
        --arch)     MODE_ALL=false; MODE_ARCH=true ;;
        --tests)    MODE_ALL=false; MODE_TESTS=true ;;
    esac
done
$MODE_ALL && MODE_SECURITY=true && MODE_CI=true && MODE_ARCH=true && MODE_TESTS=true

# ─── Helper Functions ───

pass() { PASS=$((PASS+1)); echo -e "${GREEN}[✓ PASS]${NC} $1" | tee -a "$REPORT"; }
warn() { WARN=$((WARN+1)); echo -e "${YELLOW}[⚠ WARN]${NC} $1" | tee -a "$REPORT"; }
fail() { FAIL=$((FAIL+1)); echo -e "${RED}[✗ FAIL]${NC} $1" | tee -a "$REPORT"; }
section() { echo -e "\n${BLUE}══════ $1 ══════${NC}" | tee -a "$REPORT"; }

cd "$PROJECT"

echo "╔══════════════════════════════════════════════════════════════╗" | tee "$REPORT"
echo "║          AGENT SELF-CHECK — $(date -u '+%Y-%m-%d %H:%M UTC')          ║" | tee -a "$REPORT"
echo "╚══════════════════════════════════════════════════════════════╝" | tee -a "$REPORT"

# ═══════════════════════════════════════════════════════════════
# 1. SRE: Golden Signals (надёжность)
# ═══════════════════════════════════════════════════════════════

if $MODE_CI; then
section "SRE — Golden Signals"

# 1.1 Диск
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')
if [ "$DISK_USAGE" -lt 80 ]; then
    pass "Disk usage: ${DISK_USAGE}% (< 80%)"
elif [ "$DISK_USAGE" -lt 90 ]; then
    warn "Disk usage: ${DISK_USAGE}% (80-90%, monitor)"
else
    fail "Disk usage: ${DISK_USAGE}% (> 90%, critical!)"
fi

# 1.2 Память
MEM_USAGE=$(free | awk '/Mem:/ {printf "%.0f", $3/$2 * 100}')
if [ "$MEM_USAGE" -lt 80 ]; then
    pass "Memory usage: ${MEM_USAGE}% (< 80%)"
elif [ "$MEM_USAGE" -lt 90 ]; then
    warn "Memory usage: ${MEM_USAGE}% (80-90%)"
else
    fail "Memory usage: ${MEM_USAGE}% (> 90%)"
fi

# 1.3 Процессы (есть ли зависшие билды?)
STUCK_BUILDS=$(ps aux | grep -c "gh.*run.*watch" || true)
if [ "$STUCK_BUILDS" -eq 0 ]; then
    pass "No stuck CI processes detected"
else
    warn "Found $STUCK_BUILDS potentially stuck CI processes"
fi

# 1.4 Error Budget (fails за сегодня)
if [ -f "$ERROR_LOG" ]; then
    TODAY=$(date -u +%Y-%m-%d)
    TODAY_ERRORS=$(grep -c "$TODAY" "$ERROR_LOG" 2>/dev/null || echo "0")
    if [ "$TODAY_ERRORS" -lt 3 ]; then
        pass "Error budget: $TODAY_ERRORS errors today (< 3 budget)"
    elif [ "$TODAY_ERRORS" -lt 5 ]; then
        warn "Error budget: $TODAY_ERRORS errors today (approaching limit)"
    else
        fail "Error budget EXCEEDED: $TODAY_ERRORS errors today (limit: 5)"
    fi
else
    pass "No error log found (clean start)"
fi
fi

# ═══════════════════════════════════════════════════════════════
# 2. CODE REVIEW: Проверка качества кода
# ═══════════════════════════════════════════════════════════════

if $MODE_ARCH; then
section "CODE REVIEW — Code Quality"

# 2.1 Null reference checks (Unity C#)
CS_FILES=$(find UnityProject/Assets/Scripts -name "*.cs" 2>/dev/null | wc -l)
if [ "$CS_FILES" -gt 0 ]; then
    NULL_ISSUES=$(grep -rn "\.GetComponent<" UnityProject/Assets/Scripts/ 2>/dev/null | grep -v "?." | grep -v "TryGetComponent" | wc -l)
    if [ "$NULL_ISSUES" -eq 0 ]; then
        pass "No unsafe GetComponent calls found"
    elif [ "$NULL_ISSUES" -lt 5 ]; then
        warn "Found $NULL_ISSUES potential null-ref risks (GetComponent without null check)"
    else
        fail "Found $NULL_ISSUES potential null-ref risks — review needed"
    fi
    
    # 2.2 Large files (architect check)
    LARGE_FILES=$(find UnityProject/Assets/Scripts -name "*.cs" -exec wc -l {} + 2>/dev/null | awk '$1 > 300 {print $2 " (" $1 " lines)"}')
    if [ -z "$LARGE_FILES" ]; then
        pass "No files exceed 300 lines (good modularity)"
    else
        warn "Large files found (consider splitting):"
        echo "$LARGE_FILES" | head -5 | while read line; do
            echo "    → $line"
        done | tee -a "$REPORT"
    fi
    
    # 2.3 Hardcoded values
    HARDCODED_V3=$(grep -rn "new Vector3(" UnityProject/Assets/Scripts/ 2>/dev/null | wc -l)
    if [ "$HARDCODED_V3" -lt 10 ]; then
        pass "Hardcoded Vector3 count: $HARDCODED_V3 (reasonable)"
    else
        warn "Found $HARDCODED_V3 hardcoded Vector3 values — consider constants"
    fi
else
    warn "No Unity C# files found for code review"
fi

# 2.4 console.log in production JS
JS_FILES=$(find . -name "*.js" -not -path "./node_modules/*" -not -path "./UnityProject/*" 2>/dev/null | wc -l)
if [ "$JS_FILES" -gt 0 ]; then
    CONSOLE_LOGS=$(grep -rn "console\.log" --include="*.js" . 2>/dev/null | grep -v node_modules | grep -v "self_check" | wc -l)
    if [ "$CONSOLE_LOGS" -lt 5 ]; then
        pass "console.log count: $CONSOLE_LOGS (acceptable)"
    else
        warn "Found $CONSOLE_LOGS console.log statements in production JS"
    fi
fi
fi

# ═══════════════════════════════════════════════════════════════
# 3. SECURITY: Проверка безопасности
# ═══════════════════════════════════════════════════════════════

if $MODE_SECURITY; then
section "SECURITY — Vulnerability Scan"

# 3.1 Hardcoded secrets
SECRETS_FOUND=0
# Проверяем паттерны: API_KEY, token=, password=, secret= в исходниках
for pattern in "API_KEY" "api_key" "API_SECRET" "BOT_TOKEN" "PASSWORD" "CLIENT_SECRET"; do
    MATCHES=$(grep -rn "$pattern\s*=" --include="*.cs" --include="*.js" --include="*.json" --include="*.yaml" --include="*.yml" . 2>/dev/null | grep -v "node_modules" | grep -v ".env.example" | grep -v "SELF_IMPROVEMENT" | wc -l)
    if [ "$MATCHES" -gt 0 ]; then
        warn "Found $MATCHES instances of '$pattern=' in source code"
        SECRETS_FOUND=$((SECRETS_FOUND + MATCHES))
    fi
done
if [ "$SECRETS_FOUND" -eq 0 ]; then
    pass "No hardcoded secrets detected"
fi

# 3.2 Dangerous patterns
DANGEROUS_EVAL=$(grep -rn "eval(" --include="*.js" . 2>/dev/null | grep -v node_modules | grep -v "self_check" | wc -l)
if [ "$DANGEROUS_EVAL" -eq 0 ]; then
    pass "No eval() usage found"
else
    warn "Found $DANGEROUS_EVAL eval() calls — potential code injection risk"
fi

# 3.3 .env file exposed
if [ -f ".env" ]; then
    ENV_GIT=$(git ls-files .env 2>/dev/null)
    if [ -n "$ENV_GIT" ]; then
        fail ".env is tracked by git! Remove immediately: git rm --cached .env"
    else
        pass ".env exists but is not tracked by git"
    fi
else
    pass "No .env file found (secrets managed elsewhere)"
fi

# 3.4 Debug mode in production
DEBUG_MODE=$(grep -rn "debug.*=.*true" --include="*.cs" --include="*.js" . 2>/dev/null | grep -v node_modules | grep -v "self_check" | wc -l)
if [ "$DEBUG_MODE" -lt 3 ]; then
    pass "Debug mode instances: $DEBUG_MODE (acceptable)"
else
    warn "Found $DEBUG_MODE debug=true instances — ensure not in production"
fi
fi

# ═══════════════════════════════════════════════════════════════
# 4. API TESTER: Тесты и валидация
# ═══════════════════════════════════════════════════════════════

if $MODE_TESTS; then
section "API TESTER — Tests & Validation"

# 4.1 JSON валидность
for json_file in state.json tasks.json; do
    if [ -f "$json_file" ]; then
        if python3 -c "import json; json.load(open('$json_file'))" 2>/dev/null; then
            pass "$json_file: valid JSON"
        else
            fail "$json_file: INVALID JSON — corrupted!"
        fi
    else
        warn "$json_file: not found"
    fi
done

# 4.2 npm test (если доступен)
if [ -f "package.json" ]; then
    if grep -q '"test"' package.json; then
        # Проверяем не "echo" ли это
        TEST_CMD=$(python3 -c "import json; print(json.load(open('package.json')).get('scripts',{}).get('test',''))")
        if echo "$TEST_CMD" | grep -q "echo"; then
            warn "npm test is a placeholder — no real tests configured"
        else
            pass "npm test configured: $TEST_CMD"
        fi
    else
        warn "No test script in package.json"
    fi
fi

# 4.3 Coverage of source files
CS_WITH_TESTS=0
CS_TOTAL=$(find UnityProject/Assets/Scripts -name "*.cs" 2>/dev/null | wc -l)
# Простая проверка: есть ли рядом *Test*.cs файлы
CS_TESTS=$(find UnityProject/Assets/Scripts -name "*Test*.cs" -o -name "*Tests*.cs" 2>/dev/null | wc -l)
if [ "$CS_TOTAL" -gt 0 ]; then
    TEST_RATIO=$((CS_TESTS * 100 / CS_TOTAL))
    if [ "$TEST_RATIO" -ge 30 ]; then
        pass "Test coverage indicator: ~${TEST_RATIO}% (≥30%)"
    else
        warn "Test coverage indicator: ~${TEST_RATIO}% (< 30%, consider adding tests)"
    fi
else
    warn "No C# source files found"
fi
fi

# ═══════════════════════════════════════════════════════════════
# 5. CI STATUS: Проверка сборки
# ═══════════════════════════════════════════════════════════════

if $MODE_CI; then
section "CI STATUS — Build Health"

# 5.1 Git status
GIT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
GIT_DIRTY=$(git status --porcelain 2>/dev/null | wc -l)
if [ "$GIT_DIRTY" -eq 0 ]; then
    pass "Working tree clean on branch: $GIT_BRANCH"
else
    warn "Working tree has $GIT_DIRTY uncommitted changes on branch: $GIT_BRANCH"
    git status --porcelain 2>/dev/null | head -5 | while read line; do
        echo "    $line"
    done | tee -a "$REPORT"
fi

# 5.2 WASM timestamp (deployed?)
if [ -f "/var/www/office/Build/WebGL.wasm.gz" ]; then
    WASM_TIME=$(stat -c %Y /var/www/office/Build/WebGL.wasm.gz 2>/dev/null || echo "0")
    NOW_TIME=$(date +%s)
    WASM_AGE=$(( (NOW_TIME - WASM_TIME) / 60 ))
    if [ "$WASM_AGE" -lt 60 ]; then
        pass "WASM deployed: ${WASM_AGE} min ago"
    elif [ "$WASM_AGE" -lt 360 ]; then
        warn "WASM age: ${WASM_AGE} min (> 1 hour, check if stale)"
    else
        fail "WASM age: ${WASM_AGE} min (> 6 hours, likely stale)"
    fi
else
    warn "No WASM build found at /var/www/office/Build/"
fi

# 5.3 Recent CI runs (если gh доступен)
if command -v gh &> /dev/null; then
    RECENT_FAILS=$(gh run list --limit 5 --json conclusion -q '[.[] | select(.conclusion == "failure")] | length' 2>/dev/null || echo "unknown")
    if [ "$RECENT_FAILS" = "unknown" ]; then
        warn "Could not fetch CI status (gh auth or network issue)"
    elif [ "$RECENT_FAILS" -eq 0 ]; then
        pass "Last 5 CI runs: all green ✓"
    elif [ "$RECENT_FAILS" -le 2 ]; then
        warn "Last 5 CI runs: $RECENT_FAILS failures"
    else
        fail "Last 5 CI runs: $RECENT_FAILS failures — CI health degraded"
    fi
else
    warn "gh CLI not available — cannot check CI status"
fi
fi

# ═══════════════════════════════════════════════════════════════
# 6. INCIDENT COMMANDER: Pattern Analysis
# ═══════════════════════════════════════════════════════════════

if $MODE_CI; then
section "INCIDENT COMMANDER — Pattern Analysis"

# 6.1 Проверка на повторяющиеся ошибки
if [ -f "$ERROR_LOG" ]; then
    TOTAL_ERRORS=$(wc -l < "$ERROR_LOG")
    REPEATING=$(tail -50 "$ERROR_LOG" | grep -oP '\[.*?\]' | sort | uniq -c | sort -rn | head -1)
    REPEAT_COUNT=$(echo "$REPEATING" | awk '{print $1}')
    
    if [ "$REPEAT_COUNT" -gt 3 ]; then
        fail "Repeating error pattern detected ($REPEAT_COUNT times): $REPEATING"
        echo "    → RECOMMENDATION: Run 5 Whys analysis for this pattern" | tee -a "$REPORT"
    elif [ "$TOTAL_ERRORS" -gt 0 ]; then
        pass "Error log: $TOTAL_ERRORS total errors, no critical repeating patterns"
    else
        pass "Error log: clean (no errors logged)"
    fi
else
    pass "No error log found — system appears clean"
fi

# 6.2 Learnings database status
LEARNINGS_FILE="$PROJECT/scripts/ops/learnings.json"
if [ -f "$LEARNINGS_FILE" ]; then
    PATTERN_COUNT=$(python3 -c "import json; print(len(json.load(open('$LEARNINGS_FILE')).get('patterns',[])))" 2>/dev/null || echo "0")
    pass "Learnings database: $PATTERN_COUNT patterns recorded"
    
    # Проверяем свежесть
    LAST_LEARNED=$(python3 -c "
import json
data = json.load(open('$LEARNINGS_FILE'))
patterns = data.get('patterns', [])
if patterns:
    print(patterns[-1].get('learned', 'unknown'))
else:
    print('none')
" 2>/dev/null || echo "unknown")
    if [ "$LAST_LEARNED" != "none" ]; then
        pass "Last pattern learned: $LAST_LEARNED"
    fi
else
    warn "No learnings.json found — pattern tracking not active"
fi
fi

# ═══════════════════════════════════════════════════════════════
# 7. PM: Backlog Health
# ═══════════════════════════════════════════════════════════════

if $MODE_ARCH; then
section "PM — Backlog & Documentation"

# 7.1 Ключевые файлы существуют?
for doc in BACKLOG.md SELF_IMPROVEMENT_PLAN.md README.md; do
    if [ -f "$doc" ]; then
        SIZE=$(wc -c < "$doc")
        if [ "$SIZE" -gt 100 ]; then
            pass "$doc exists (${SIZE} bytes)"
        else
            warn "$doc exists but is nearly empty (${SIZE} bytes)"
        fi
    else
        warn "$doc not found"
    fi
done

# 7.2 Plan file актуален?
if [ -f "PLAN.md" ]; then
    PLAN_AGE=$(( ($(date +%s) - $(stat -c %Y PLAN.md)) / 3600 ))
    if [ "$PLAN_AGE" -lt 24 ]; then
        pass "PLAN.md updated ${PLAN_AGE}h ago (fresh)"
    else
        warn "PLAN.md updated ${PLAN_AGE}h ago (consider refreshing)"
    fi
fi
fi

# ═══════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════

section "SUMMARY"
TOTAL=$((PASS + WARN + FAIL))

echo "" | tee -a "$REPORT"
echo "  ✓ PASS:  $PASS" | tee -a "$REPORT"
echo "  ⚠ WARN:  $WARN" | tee -a "$REPORT"
echo "  ✗ FAIL:  $FAIL" | tee -a "$REPORT"
echo "  ────────" | tee -a "$REPORT"
echo "  Total:   $TOTAL checks" | tee -a "$REPORT"
echo "" | tee -a "$REPORT"

if [ "$FAIL" -gt 0 ]; then
    echo -e "${RED}STATUS: CRITICAL — $FAIL issues need immediate attention${NC}" | tee -a "$REPORT"
    exit 2
elif [ "$WARN" -gt 3 ]; then
    echo -e "${YELLOW}STATUS: WARNING — $WARN items need review${NC}" | tee -a "$REPORT"
    exit 1
else
    echo -e "${GREEN}STATUS: HEALTHY — system is in good shape${NC}" | tee -a "$REPORT"
    exit 0
fi
