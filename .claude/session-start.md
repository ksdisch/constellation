# session starter — Constellation

Paste one of the two prompts below at the start of any fresh Claude Code session on `constellation`. Path A is the default for general work; Path B is for shipping a specific backlog item via the orchestrator.

---

## Path A — General work (default)

```
I'm the owner of constellation. Please read CLAUDE.md first — it has the project conventions, hard rules, and stack. Then read BACKLOG.md to see what's active. (PROJECT_GUIDE.md is a historical M4 snapshot — background and early history only; don't trust its present-tense claims.)

Project context to keep in mind:
- Phase: M11 shipped — 4 powers, 3 planets, galaxy hub, talents, telemetry portrait, music + master mute. M13 "hardening" in flight: the fix plan is docs/AUDIT-2026-07-09.md; the audit item's **Progress** line in BACKLOG.md says exactly which phases have landed. M12 (planet generator spike) is parked in draft PRs #23/#24.
- Stack (locked — no new deps): TypeScript 5.9 strict, Phaser 3.90 (game/laptop), React 19 (phone), Node + ws (relay), Vite 6 multi-entry. package.json is the version source of truth.
- Four-side rule for powers: PowerId literal in src/shared/protocol.ts + tile in src/phone/components/Spellbook.tsx + puzzle component under src/phone/components/puzzles/ + cast handler in src/game/scenes/Planet.ts. All four wire in the same change.
- Planning lives in-repo: BACKLOG.md (active queue + full Done history) and docs/ (audit fix plan, ideas, per-scope briefs). The original M0–M5 plan doc at ~/.claude/plans/ is historical.
- Testing: colocated pure-logic Vitest suites are a sanctioned gate alongside typecheck/build, and the ?test=1 bridge (docs/AUTONOMY.md) verifies real gameplay headlessly. The human playtest remains the game-feel gate.

Once you've read those, tell me what's queued in BACKLOG.md, what milestone we're in, and ask which item I want to work on.

Hard rules to respect this session:
- Do NOT push to main directly. All work goes through a feature branch + PR.
- Do NOT introduce new dependencies.
- Do NOT add CSS files, frameworks, or non-inline styling on the phone side.
- Do NOT put game logic in the relay (it is an allowlist forwarder — the pure relayForward() in server/relay.ts; a new peer-forwarded message type needs a relayForward rule).
- Do NOT break Freeze Stars when adding new powers (manual smoke after any Spellbook.tsx / App.tsx / Planet.ts touch).
- Do NOT add features, refactors, or scope beyond what we agree on.
```

---

## Path B — Ship a specific backlog item via the orchestrator

```
I'm the owner of constellation. Please act as the backlog-item-shipping orchestrator.

Read .claude/orchestrator.md end-to-end and adopt it as your system prompt for this session. Read CLAUDE.md and BACKLOG.md as standing context.

The backlog item I want to ship is: <PASTE THE [Type] Title HEADING OR THE KEBAB SLUG HERE>

If docs/scopes/<kebab-id>/brief.md doesn't exist yet, draft a skeleton from this intent — <ONE-PARAGRAPH SUMMARY OF WHAT YOU WANT TO BUILD AND WHY> — using the .claude/templates/phase-brief.md shape, write it to that path, and pause for me to fill in the locked design and confirm before you dispatch the auditor.

If the brief already exists, proceed: dispatch the auditor, pause for me to review the audit (including the blast-radius tier), then run the rest of the phases. Push + PR open are gated on the audited blast-radius tier — low ships hands-free, medium has a 30-second proceed-by-default window, high pauses for my explicit "ship it".

**Running autonomously?** See §3 Mode A in `.claude/orchestrator.md` — the audit and smoke human-pause checkpoints don't apply; self-check the gates and proceed if clean. Use the Mode A session prompt from §3 instead of this one.
```

---

## What every session should know

**Files to load when relevant (only those that exist in this repo):**
- `CLAUDE.md` — project conventions, hard rules, stack, framework gotchas, orchestrator-worker pattern note
- `README.md` — run instructions + stack overview + status
- `BACKLOG.md` — active work queue with `## Open` / `## In Progress` / `## Done` lifecycle
- `PROJECT_GUIDE.md` — **historical snapshot (M4, generated 2026-05-16)**: good for early history and decision context, but its present-tense claims are stale — don't onboard from it
- `docs/ideas/` — deferred ideas not yet ready to pick (e.g., `specialization.md`)
- `docs/scopes/<id>/brief.md` — per-scope locked design (orchestrator-driven)
- `docs/scopes/<id>/audit.md` — per-scope audit (auditor-written)
- `.claude/orchestrator.md` — general orchestrator system prompt (use via Path B above)
- `.claude/orchestrator-prompt.md` — historical M4 per-scope brief, kept for reference
- `.claude/agents/*.md` — specialist role prompts (NOT subagent types — dispatched as `general-purpose` with the role embedded inline)
- `.claude/templates/phase-brief.md` — dispatch template the orchestrator fills per phase
- `docs/AUDIT-2026-07-09.md` — the current fix plan (M13 hardening). The original M0–M5 plan doc at `~/.claude/plans/` is historical and lives outside the repo

**What no session should do automatically:**
- Push to `main` directly. PRs only; user merges.
- Force-push, amend published commits, or skip hooks.
- Make architectural decisions without surfacing the choice in the per-scope brief first.
- Add features, refactors, or scope beyond the active brief.
- Skip the audit phase when running the orchestrator.
- Bypass the blast-radius gating in pr-shipper (high-tier work waits for "ship it"; medium-tier work has a 30s window; low-tier ships hands-free).
- Add CI workflows or test infrastructure beyond existing Vitest setup. (Pure-logic unit tests in Vitest are encouraged; framework-level tests are not.)
- Add dependencies. The stack is locked: Phaser, React, ws, Vite, tsx, TypeScript.
- Put game logic in `server/server.ts` — the relay is an allowlist forwarder (`relayForward` in `server/relay.ts`); it never reads game state.
- Add CSS files, frameworks, or `className`-based styling on the phone side. Inline `style={{}}` only.
- Modify `src/shared/protocol.ts` outside the protocol-steward phase, and never without same-commit updates to both `src/game/` and `src/phone/`.
- Break Freeze Stars. It's the M2 reference power and the regression check in every smoke checklist.
