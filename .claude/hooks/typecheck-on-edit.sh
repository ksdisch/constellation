#!/usr/bin/env bash
# PostToolUse hook — typecheck after Claude edits a TypeScript file.
#
# This repo is TypeScript strict (noUnusedLocals/Params/ImplicitReturns, no any),
# so `tsc --noEmit` is the real gate. Running it right after an edit surfaces
# breaks to Claude immediately instead of at the build step.
#
# Only fires for .ts/.tsx edits (other files exit 0 fast). On type errors it
# feeds the compiler output back to Claude (exit 2). During a deliberate
# multi-file change the intermediate states may not typecheck — that's expected;
# Claude can keep going and the hook goes quiet once the set is consistent.
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

cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0

if out=$(npm run --silent typecheck 2>&1); then
  exit 0
fi

{
  echo "tsc --noEmit failed after editing ${file}:"
  printf '%s\n' "$out" | tail -n 40
} >&2
exit 2
