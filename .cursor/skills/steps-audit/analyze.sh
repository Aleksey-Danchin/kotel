#!/usr/bin/env bash
set -euo pipefail

# Post-mortem analysis of the last steps-man run.
# Checks progress.json integrity, git history, and agent transcripts.

PROJECT_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
PROGRESS_FILE="$PROJECT_ROOT/.dev/progress.json"
TRANSCRIPTS_DIR="$HOME/.cursor/projects/home-aleksey-Desktop-kris/agent-transcripts"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
DIM='\033[2m'
BOLD='\033[1m'
NC='\033[0m'

header() { echo -e "\n${BOLD}${BLUE}═══ $1 ═══${NC}"; }
ok()     { echo -e "  ${GREEN}✓${NC} $1"; }
warn()   { echo -e "  ${YELLOW}⚠${NC} $1"; }
fail()   { echo -e "  ${RED}✗${NC} $1"; }
info()   { echo -e "  ${DIM}$1${NC}"; }

ISSUES=0

# ─── 1. Progress file ───────────────────────────────────────────

header "1. Progress file analysis"

if [[ ! -f "$PROGRESS_FILE" ]]; then
  fail "progress.json not found at $PROGRESS_FILE"
  exit 1
fi

STEP_COUNT=$(python3 -c "import json; d=json.load(open('$PROGRESS_FILE')); print(len(d['steps']))")
echo -e "  Steps in progress.json: ${BOLD}$STEP_COUNT${NC}"

python3 -c "
import json, sys

d = json.load(open('$PROGRESS_FILE'))
issues = 0

for s in d['steps']:
    order = s['order']
    status = s['status']
    has_progress = 'progress' in s
    items = len(s.get('progress', []))
    commit = s.get('commitHash', None)

    # Check for missing progress array
    if status in ('completed', 'in_progress') and not has_progress:
        print(f'  \033[0;31m✗\033[0m Step {order}: status={status} but NO progress array')
        issues += 1
    elif has_progress:
        # Check AC items
        ac_items = [p for p in s['progress'] if p['id'].startswith('ac-')]
        pending_ac = [p for p in ac_items if p['status'] not in ('completed', 'cancelled')]
        if status == 'completed' and pending_ac:
            names = ', '.join(p['id'] for p in pending_ac)
            print(f'  \033[0;31m✗\033[0m Step {order}: completed but AC items still pending: {names}')
            issues += 1
        else:
            print(f'  \033[0;32m✓\033[0m Step {order}: status={status}, progress={items} items, commit={commit or \"none\"}')
    else:
        print(f'  \033[2m  Step {order}: status={status} (pending, no progress yet)\033[0m')

    # Check commit hash
    if status == 'completed' and not commit:
        print(f'  \033[0;31m✗\033[0m Step {order}: completed but no commitHash')
        issues += 1

print(f'\n  Issues found: {issues}')
with open('/tmp/steps-analysis-issues', 'w') as f:
    f.write(str(issues))
"

ISSUES=$(cat /tmp/steps-analysis-issues 2>/dev/null || echo 0)

# ─── 2. Git history vs progress.json ─────────────────────────────

header "2. Git history — progress state at each commit"

STEP_COMMITS=$(git -C "$PROJECT_ROOT" log --oneline --all --grep="^step-" --format='%h' | tac)

if [[ -z "$STEP_COMMITS" ]]; then
  warn "No step commits found in git history"
else
  for COMMIT in $STEP_COMMITS; do
    MSG=$(git -C "$PROJECT_ROOT" log -1 --format='%s' "$COMMIT")
    DATE=$(git -C "$PROJECT_ROOT" log -1 --format='%ai' "$COMMIT")

    # Check progress.json at this commit
    PROGRESS_STATE=$(git -C "$PROJECT_ROOT" show "$COMMIT:.dev/progress.json" 2>/dev/null | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    results = []
    for s in d['steps']:
        order = s['order']
        status = s['status']
        has_p = 'progress' in s
        items = len(s.get('progress', []))
        if status == 'in_progress':
            if has_p:
                results.append(f'step {order}: in_progress ✓progress({items})')
            else:
                results.append(f'step {order}: in_progress ✗NO_PROGRESS')
    print(' | '.join(results) if results else 'no in_progress steps')
except:
    print('parse error')
" 2>/dev/null || echo "no progress.json")

    echo -e "  ${CYAN}$COMMIT${NC} $MSG"
    echo -e "    ${DIM}$DATE${NC}"

    if echo "$PROGRESS_STATE" | grep -q "NO_PROGRESS"; then
      fail "  $PROGRESS_STATE"
      ISSUES=$((ISSUES + 1))
    else
      info "  $PROGRESS_STATE"
    fi
  done
fi

# ─── 3. Uncommitted changes in progress.json ─────────────────────

header "3. Uncommitted progress.json changes"

DIFF=$(git -C "$PROJECT_ROOT" diff HEAD -- .dev/progress.json 2>/dev/null || true)
if [[ -n "$DIFF" ]]; then
  warn "progress.json has uncommitted changes:"
  echo "$DIFF" | head -30 | while IFS= read -r line; do
    if [[ "$line" == +* ]]; then
      echo -e "    ${GREEN}$line${NC}"
    elif [[ "$line" == -* ]]; then
      echo -e "    ${RED}$line${NC}"
    else
      echo -e "    ${DIM}$line${NC}"
    fi
  done
else
  ok "progress.json matches HEAD"
fi

# ─── 4. Agent transcripts — find steps-man runs ──────────────────

header "4. Agent transcript analysis"

if [[ ! -d "$TRANSCRIPTS_DIR" ]]; then
  warn "Transcripts directory not found: $TRANSCRIPTS_DIR"
else
  echo -e "  Scanning for step-imp subagent transcripts..."

  # Find all subagent transcripts that contain step execution prompts
  STEP_SUBAGENTS=$(grep -rl "Execute the development step\|acting as the step-imp" "$TRANSCRIPTS_DIR" \
    --include="*.jsonl" 2>/dev/null | grep '/subagents/' | sort || true)

  if [[ -z "$STEP_SUBAGENTS" ]]; then
    warn "No step-imp subagent transcripts found"
  else
    # Group by parent (steps-man) directory
    declare -A PARENTS_SEEN
    for SUB in $STEP_SUBAGENTS; do
      # Resolve: .../transcripts/<parent-id>/subagents/<sub-id>.jsonl
      PARENT_DIR=$(dirname "$(dirname "$SUB")")
      PARENT_ID=$(basename "$PARENT_DIR")

      if [[ -n "${PARENTS_SEEN[$PARENT_ID]:-}" ]]; then
        continue
      fi

      # Count step-imp subagents in this parent
      STEP_SUBS_IN_PARENT=$(grep -l "Execute the development step\|acting as the step-imp" \
        "$PARENT_DIR/subagents/"*.jsonl 2>/dev/null || true)
      SUB_COUNT=$(echo "$STEP_SUBS_IN_PARENT" | grep -c '.' || echo 0)

      if [[ "$SUB_COUNT" -lt 2 ]]; then
        continue  # Not a steps-man (needs multiple step-imp subagents)
      fi

      PARENTS_SEEN[$PARENT_ID]=1
      echo -e "\n  ${BOLD}Steps-man agent:${NC} ${CYAN}$PARENT_ID${NC} (${SUB_COUNT} step-imp subagents)"

      for STEP_SUB in $STEP_SUBS_IN_PARENT; do
        [[ -f "$STEP_SUB" ]] || continue
        SUB_ID=$(basename "$STEP_SUB" .jsonl)
        SUB_LINES=$(wc -l < "$STEP_SUB")

        STEP_NUM=$(head -1 "$STEP_SUB" | grep -oP 'Step order.*?(\d+)' | grep -oP '\d+' | head -1 || true)
        STEP_FILE=$(head -1 "$STEP_SUB" | grep -oP '\d+-[a-z-]+\.md' | head -1 || true)

        if head -1 "$STEP_SUB" | grep -q "acting as the step-imp"; then
          FORMAT="${YELLOW}GENERIC fallback${NC}"
          IS_GENERIC=1
        elif head -1 "$STEP_SUB" | grep -q "Execute the development step"; then
          FORMAT="${GREEN}proper step-imp${NC}"
          IS_GENERIC=0
        else
          FORMAT="${DIM}unknown${NC}"
          IS_GENERIC=0
        fi

        RESULT=$(grep -oP 'RESULT: \w+' "$STEP_SUB" | tail -1 || echo "no result")

        if [[ -n "$STEP_NUM" ]]; then
          echo -e "    step ${BOLD}$STEP_NUM${NC} ${DIM}($STEP_FILE)${NC} | $FORMAT | ${SUB_LINES} lines | $RESULT"
        else
          echo -e "    ${DIM}$SUB_ID${NC} | $FORMAT | ${SUB_LINES} lines | $RESULT"
        fi

        if [[ "$IS_GENERIC" -eq 1 ]]; then
          warn "  Step $STEP_NUM was launched as GENERIC agent (no step-imp.md loaded)"
          ISSUES=$((ISSUES + 1))
        fi
      done
    done

    if [[ ${#PARENTS_SEEN[@]} -eq 0 ]]; then
      info "No steps-man agents with multiple step-imp subagents found"
    fi
  fi
fi

# ─── 5. Summary ──────────────────────────────────────────────────

header "Summary"

if [[ "$ISSUES" -eq 0 ]]; then
  echo -e "  ${GREEN}${BOLD}All checks passed. No issues detected.${NC}"
else
  echo -e "  ${RED}${BOLD}$ISSUES issue(s) detected.${NC}"
  echo -e "  ${DIM}Review the output above for details.${NC}"
fi

echo ""
