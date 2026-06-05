#!/usr/bin/env bash
# PreToolUse hook — remind (non-blocking) when editing the wire-protocol boundary.
#
# src/shared/protocol.ts is the strict cross-boundary contract between the game
# (laptop) and the phone client. CLAUDE.md requires that any change here be
# matched on BOTH sides in the same commit, and a PowerId change pulls in the
# whole power contract. This hook injects that reminder right before the edit.
#
# It does NOT block the edit — it allows it and adds context, so it can't loop.
set -euo pipefail

input=$(cat)

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
  */src/shared/protocol.ts|src/shared/protocol.ts)
    cat <<'JSON'
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow","additionalContext":"⚠ src/shared/protocol.ts is the strict wire-protocol boundary. In THIS SAME commit, update both src/game and src/phone to match. If you are changing PowerId, wire every side of the power contract: the Spellbook tile (Spellbook.tsx), a puzzle component (clone QuickMath.tsx) registered in App.tsx FEEDBACK *and* the render if-chain, and the castPower() switch in src/game/scenes/Planet.ts. The /new-power skill walks all of this."}}
JSON
    ;;
esac

exit 0
