#!/usr/bin/env bash
# PostToolUse hook — run the colocated Vitest sibling after Claude edits a source file.
#
# This repo colocates pure-logic tests next to the module (foo.ts -> foo.test.ts).
# Running only that one sibling right after an edit catches logic regressions fast
# without spending a full suite run. Complements typecheck-on-edit (which guards
# types); this guards behavior.
#
# Only fires for src/*.ts edits (other files, including .tsx, exit 0 fast — there
# are no .tsx tests). If the edited file IS a *.test.ts, that test is run; otherwise
# the foo.ts -> foo.test.ts sibling is run, but only if it exists. On failure it
# feeds the test output back to Claude (exit 2). During a deliberate multi-file
# change the intermediate states may fail — that's expected; the hook goes quiet
# once the change settles.
#
# vitest.config.ts sets fileParallelism:false, so a single-file run is fast and
# deterministic.
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

# Gate on src/*.ts only. .tsx and everything else exit 0 fast.
case "$file" in
  */src/*.test.ts) test_file="$file" ;;
  */src/*.ts) test_file="${file%.ts}.test.ts" ;;
  *) exit 0 ;;
esac

cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0

# Only run if the sibling test actually exists.
[ -f "$test_file" ] || exit 0

if out=$(npx vitest run "$test_file" 2>&1); then
  exit 0
fi

{
  echo "vitest failed for ${test_file} after editing ${file}:"
  printf '%s\n' "$out" | tail -n 40
} >&2
exit 2
