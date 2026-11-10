#!/usr/bin/env bash
# Stop hook: gate the end of a turn on lint + affected unit tests, intact test
# locks, and a test change for every logic change.
#
# Scope: everything this branch changed against its base (committed or not), so
# committing does not hide work from the gate. Runs eslint on changed JS/JSX
# files under src/ and `vitest related` on them (Playwright runs in CI only).
#
# Exit 2 blocks the stop and feeds stderr back to Claude. Any other exit lets it
# stop, so every error path below exits 2 itself (fail closed).
#
# Loop guards:
#   - a pass is remembered per working-tree fingerprint, a failure is not: the
#     gate keeps blocking while the tree is red.
#   - after MAX_BLOCKS consecutive failing runs the gate lets the turn end and
#     tells the user it is still red; that tree is then waived until it changes.
#
# Also invoked by the treinoway/ root dispatcher (verify-dispatch.sh) with
# CLAUDE_PROJECT_DIR pointing at this repo.
set -uo pipefail

BASE_BRANCH=master
MAX_BLOCKS=3

input=$(cat)

# Block the stop with a reason; the only way out of this script on failure.
block() {
  printf '%s\n' "$1" >&2
  exit 2
}

command -v jq >/dev/null 2>&1 || block "[stop-verify] jq is not installed, so the gate cannot run. Install jq."
cd "${CLAUDE_PROJECT_DIR:-$(pwd)}" 2>/dev/null || block "[stop-verify] cannot enter ${CLAUDE_PROJECT_DIR:-$(pwd)}."
top=$(git rev-parse --show-toplevel 2>/dev/null) || block "[stop-verify] ${PWD} is not a git working tree."

paths=(src)

base_ref="origin/$BASE_BRANCH"
git rev-parse --verify --quiet "$base_ref" >/dev/null || base_ref=HEAD
mb=$(git merge-base "$base_ref" HEAD 2>/dev/null || git rev-parse HEAD)

state_pass=$(git rev-parse --git-path claude-stop-verify.sha)
state_fails=$(git rev-parse --git-path claude-stop-verify.fails)
state_waived=$(git rev-parse --git-path claude-stop-verify.waived)
acked_file=$(git rev-parse --git-path claude-deviations-alerted)

workspace=$(dirname "$top")
lock_tool="$workspace/.claude/bin/test-lock"
gate_log="$workspace/.claude/state/gate-log.jsonl"

# Append one JSON line per gate run for the harness feedback loop.
log_run() { # <result> <detail>
  [[ -d "$(dirname "$gate_log")" ]] || return 0
  jq -cn --arg repo "$(basename "$top")" --arg result "$1" --arg detail "$2" --arg at "$(date -u +%FT%TZ)" \
    '{at:$at,repo:$repo,result:$result,detail:$detail}' >> "$gate_log" 2>/dev/null || true
}

changed=$(
  {
    git diff --name-only "$mb" -- "${paths[@]}"
    git ls-files --others --exclude-standard -- "${paths[@]}"
  } | grep -E '\.(js|jsx)$' | sort -u | while IFS= read -r f; do
    [[ -f "$f" ]] && printf '%s\n' "$f"
  done
)

lock_report=""
if [[ -x "$lock_tool" ]]; then
  lock_report=$("$lock_tool" verify "$top" 2>&1) || true
  [[ "$lock_report" == "locks intact" ]] && lock_report=""
fi

[[ -z "$changed" && -z "$lock_report" ]] && exit 0

fingerprint=$(
  {
    git diff "$mb" -- "${paths[@]}"
    printf '%s\n' "$changed" | while IFS= read -r f; do cat "$f"; done
    printf '%s' "$lock_report"
  } | shasum | cut -d' ' -f1
)
[[ -f "$state_pass" && "$(cat "$state_pass")" == "$fingerprint" ]] && exit 0
[[ -f "$state_waived" && "$(cat "$state_waived")" == "$fingerprint" ]] && exit 0

files=()
changed_tests=()
while IFS= read -r f; do
  [[ -n "$f" ]] || continue
  files+=("$f")
  [[ "$f" == *.test.js || "$f" == *.test.jsx ]] && changed_tests+=("$f")
done <<< "$changed"

failed=0
report=""

if [[ -n "$lock_report" ]]; then
  failed=1
  report+=$'## locked tests changed\n'"$lock_report"$'\n'
  report+=$'Locked tests are the spec: restore them (git checkout) and fix the implementation. If a test is wrong, stop and tell the user; only they can clear a lock.\n\n'
fi

if [[ ${#files[@]} -gt 0 ]]; then
  # Fixing a frozen violation leaves an unused entry in eslint-suppressions.json,
  # which fails lint; prune it so the ratchet only ever moves down.
  lint_out=$(npx --no-install eslint "${files[@]}" 2>&1)
  lint_status=$?
  if grep -q 'do not occur anymore' <<< "$lint_out"; then
    npx --no-install eslint --prune-suppressions "${files[@]}" >/dev/null 2>&1
    lint_out=$(npx --no-install eslint "${files[@]}" 2>&1)
    lint_status=$?
  fi
  if [[ $lint_status -ne 0 ]]; then
    failed=1
    report+=$'## eslint\n'"$(tail -n 40 <<< "$lint_out")"$'\n\n'
  fi

  test_out=$(npx --no-install vitest related "${files[@]}" --run --passWithNoTests 2>&1)
  if [[ $? -ne 0 ]]; then
    failed=1
    report+=$'## vitest related (unit)\n'"$(sed $'s/\x1b\\[[0-9;]*m//g' <<< "$test_out" | tail -n 60)"$'\n\n'
  fi
fi

# Source files changed with no test change: neither the sibling test
# (Foo.jsx → Foo.test.jsx) nor any changed test mentioning the module name.
untested=()
for f in ${files[@]+"${files[@]}"}; do
  case "$f" in
    *.test.js|*.test.jsx) continue ;;
    src/test/*|src/test-utils/*|src/i18n/locales/*|src/assets/*) continue ;;
    src/main.jsx|src/firebase.js) continue ;;
  esac
  base="${f%.*}"
  grep -qE "^${base//./\\.}\.test\.jsx?$" <<< "$changed" && continue
  name=$(basename "$base")
  [[ "$name" == "index" ]] && name=$(basename "$(dirname "$f")")
  if [[ ${#changed_tests[@]} -gt 0 ]] && grep -qF "$name" "${changed_tests[@]}"; then
    continue
  fi
  untested+=("$f")
done

if [[ ${#untested[@]} -gt 0 ]]; then
  failed=1
  report+=$'## changed without test changes\n'
  report+="$(printf -- '- %s\n' "${untested[@]}")"$'\n'
  report+=$'Add or update tests for these (via the frontend-test-writer agent), or tell the user why no test change is needed.\n\n'
fi

# Deviations from the code conventions must reach the user: every `deviation:`
# note or eslint-disable on this branch has to be named in the final message
# (matched by file name) once; the acknowledgement is stored only after that.
last_message=$(jq -r '.last_assistant_message // empty' <<< "$input")
deviations=$(
  {
    git diff -U0 "$mb" -- "${paths[@]}" | awk '/^\+\+\+ b\//{f=substr($0,7)} /^\+[^+]/{print f": "substr($0,2)}'
    git ls-files --others --exclude-standard -- "${paths[@]}" | while IFS= read -r f; do
      [[ -f "$f" ]] && sed "s|^|$f: |" "$f"
    done
  } | grep -E '(//|/\*).*(deviation:|eslint-disable)' | sed -E 's/:[[:space:]]+/: /' | sort -u
)
new_deviations=""
while IFS= read -r line; do
  [[ -z "$line" ]] && continue
  grep -qxF "$line" "$acked_file" 2>/dev/null && continue
  if [[ -n "$last_message" ]]; then
    if grep -qF "$(basename "${line%%: *}")" <<< "$last_message"; then
      printf '%s\n' "$line" >> "$acked_file"
      continue
    fi
  else
    printf '%s\n' "$line" >> "$acked_file"
  fi
  new_deviations+="$line"$'\n'
done <<< "$deviations"

if [[ -n "$new_deviations" ]]; then
  failed=1
  report+=$'## deviations from the code conventions\n'"$new_deviations"
  report+=$'Name each file above in your final message with its reason. A blanket `eslint-disable` (no rule list) or one without ` -- <reason>` must be replaced.\n\n'
fi

if [[ $failed -eq 0 ]]; then
  printf '%s' "$fingerprint" > "$state_pass"
  rm -f "$state_fails"
  log_run pass ""
  exit 0
fi

blocks=$(( $(cat "$state_fails" 2>/dev/null || echo 0) + 1 ))
if (( blocks > MAX_BLOCKS )); then
  rm -f "$state_fails"
  printf '%s' "$fingerprint" > "$state_waived"
  log_run waived "$(grep -E '^## ' <<< "$report" | tr '\n' ';')"
  jq -cn --arg m "[stop-verify] $(basename "$top") is still failing after $MAX_BLOCKS attempts; the turn was allowed to end. Open items: $(grep -E '^## ' <<< "$report" | tr '\n' ' ')" '{systemMessage:$m}'
  exit 0
fi
printf '%s' "$blocks" > "$state_fails"
log_run block "$(grep -E '^## ' <<< "$report" | tr '\n' ';')"

{
  printf '[stop-verify] Verification failed for %s (attempt %s of %s). ' "$(basename "$top")" "$blocks" "$MAX_BLOCKS"
  printf 'Fix it before finishing, or explain to the user why it cannot be fixed now.\n\n'
  printf '%s' "$report"
} >&2
exit 2
