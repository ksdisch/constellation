#!/usr/bin/env bash
# PostToolUse hook — typecheck after Claude edits a TypeScript file.
#
# This repo is TypeScript strict (noUnusedLocals/Params/ImplicitReturns, no any),
# so `tsc --noEmit` is the real gate. Running it right after an edit surfaces
# breaks to Claude immediately instead of at the build step. Both programs run:
# the base config, then tsconfig.tests.json (`typecheck:tests`) — test files are
# excluded from the base config, so only the second catches wire-type drift
# between a module edit and its colocated tests (F-28).
#
# Only fires for .ts/.tsx edits (other files exit 0 fast), and only for files
# inside this repo — an absolute path in some OTHER project must not trigger a
# full tsc here, where it could block on errors unrelated to that edit (F-30).
# On type errors it feeds the compiler output back to Claude (exit 2). During a
# deliberate multi-file change the intermediate states may not typecheck —
# that's expected; Claude can keep going and the hook goes quiet once the set
# is consistent.
#
# To make this ADVISORY instead of blocking, change the final `exit 2` to `exit 0`.
set -euo pipefail

input=$(cat)

# Extract the edited file path from the hook JSON using node (always present in
# this repo). Falls back to empty string if parsing fails.
file=$(printf '%s' "$input" | node -e '
  let s = "";
  process.stdin.on("data", d => (s += d)).on("end", () => {
    try {
      const j = JSON.parse(s);
      const t = j.tool_input || {};
      process.stdout.write(t.file_path || t.path || "");
    } catch { process.stdout.write(""); }
  });
' 2>/dev/null || true)

case "$file" in
  *.ts|*.tsx) ;;
  *) exit 0 ;;
esac

# Repo-scope guard (F-30): skip absolute paths outside this project. Relative
# paths can't be scope-checked; treat them as repo-relative (the hook cwd).
if [ -n "${CLAUDE_PROJECT_DIR:-}" ]; then
  case "$file" in
    /*)
      case "$file" in
        "${CLAUDE_PROJECT_DIR%/}"/*) ;;
        *) exit 0 ;;
      esac
      ;;
  esac
fi

cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0

if ! out=$(npm run --silent typecheck 2>&1); then
  {
    echo "tsc --noEmit failed after editing ${file}:"
    printf '%s\n' "$out" | tail -n 40
  } >&2
  exit 2
fi

# The base program is clean — now the test program (excluded from the base
# config), so drift between an edited module and its tests surfaces here.
if ! out=$(npm run --silent typecheck:tests 2>&1); then
  {
    echo "typecheck:tests (tsc -p tsconfig.tests.json) failed after editing ${file}:"
    printf '%s\n' "$out" | tail -n 40
  } >&2
  exit 2
fi

exit 0
