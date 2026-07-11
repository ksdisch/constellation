# Constellation — Orchestrator Invariants & Gates

This document governs every session that ships a backlog item — whether autonomous or human-supervised. §1 and §2 are non-negotiable. §3 describes the two operating modes. §4 states precedence. Read all four before acting.

---

## §1 Invariants — apply in every mode, every session

### Project hard rules
- **Never** push to `main` directly. All work through a feature branch + PR.
- **Never** merge a PR. Open it; the user merges.
- **Never** add dependencies. Stack is locked: Phaser, React, ws, Vite, tsx, TypeScript.
- **Never** add CSS files, frameworks, or non-inline styling on the phone side. Inline `style={{}}` only.
- **Never** put game logic in `server/server.ts`. The relay is an allowlist forwarder (`relayForward` in `server/relay.ts`); a new peer-forwarded message type needs a `relayForward` rule, never game logic.
- **Never** modify `server/server.ts` without an explicit Open question → user approval loop. Surface it; don't assume it's safe.
- **Never** break Freeze Stars. It is the M2 reference power; every smoke checklist must include a Freeze Stars regression check.
- **Never** skip the audit before starting implementation. The auditor's blast-radius tier drives the push gate.
- **Never** invent file paths, dates, or BACKLOG content. Read it or ask.

### Protocol wire rule
- Any change to `src/shared/protocol.ts` must be matched by changes in both `src/game/` and `src/phone/` in the same commit. Never land a half-wired protocol change.
- New powers require all four sides in the same change: `PowerId` literal in `protocol.ts`, tile in `Spellbook.tsx`, puzzle component under `src/phone/components/puzzles/`, cast handler in `Planet.ts`.

### Sync-first rule
Before any branch-aware action (audit kickoff, push, PR open), run:
```bash
git fetch origin && git status --branch
```
If the local branch is behind `origin/<branch>`, surface it and stop. Never auto-rebase or auto-pull mid-orchestration.

### Testing
Pure, framework-free logic units must have Vitest tests (colocated `*.test.ts`). Do not instantiate Phaser scenes or React components in tests — the `?test=1` autonomous bridge and `npm run build` cover framework wiring. Do not add CI infrastructure beyond what already exists.

---

## §2 Gates — blast-radius tiering (mode-independent)

### Tier classification (set by the auditor in `docs/scopes/<kebab-id>/audit.md`)
| Tier | Typical shape |
|------|---------------|
| **Low** | ≤ 3 files, no protocol or server changes, no new power/planet wires |
| **Medium** | 4–8 files, or a new power/planet (all four sides) |
| **High** | Protocol + phone + game changing together; server-adjacent; or significant blast radius |

### Push gates (enforced by the pr-shipper, or by the session itself in Mode A)
- **Low** → auto-commit, auto-push, auto-open PR. No pause.
- **Medium** → auto-commit, print diff summary + PR title/body, `sleep 30` proceed-by-default. User can interrupt any time; otherwise push + PR open after the sleep.
- **High** → stop and wait for explicit "ship it" before pushing. Always — regardless of mode.
- **Auto-bump:** if `git diff --stat origin/main...HEAD` at push time materially exceeds the audited tier (e.g., audit said "low: 1 file" but final diff is 8 files), automatically bump to the higher tier and wait.

### Hard gates that always pause — even in autonomous mode
- Missing or ambiguous brief — scope must be locked before implementation starts.
- Blast-radius **High** tier — waits for "ship it" regardless of mode.
- Auto-bumped tier at push time.
- Any required change to `server/server.ts` — always surfaces as Open question for user approval.

---

## §3 Operating modes

### Mode A — Autonomous (default for agentic / workflow runs)

One session plans → audits → builds → tests → opens PR. No human checkpoints except the hard gates above.

**What this means:**
- The session runs the audit itself (dispatches the auditor subagent or classifies blast-radius from the brief), then proceeds if the audit is clean and the tier is low or medium.
- After each implementation phase, the session runs `npm run typecheck` and `npm run build` itself. On failure: fix and retry before proceeding.
- The session runs the smoke checklist using available tools — the `?test=1` headless bridge (see `docs/AUTONOMY.md`), MCP browser tools (`kapture`, `mcp__MCP_DOCKER__browser_*`), or `computer-use`. It does NOT skip smoke and delegate to the user.
- The session opens a draft PR and stops. Merging waits for the user.
- The specialist subagents (`auditor`, `protocol-steward`, `phone-puzzle-author`, `phaser-scene-author`, `smoke-runner`, `pr-shipper`) are an available toolbox. An autonomous session may dispatch them or handle phases inline — they are not a mandatory assembly line.

**Mode A session prompt (use this to kick off an autonomous run):**
```
I'm the owner of constellation. You are running autonomously in Mode A.

Read .claude/orchestrator.md (§1–§4), CLAUDE.md, and BACKLOG.md.

The backlog item to ship is: <SCOPE ID OR KEBAB SLUG>

Self-check all §1 invariants and §2 gates as you go. Stop only at hard gates (missing brief, High-tier push, server.ts change). Open a draft PR when done; do not merge.
```

---

### Mode B — High-oversight dispatch (optional; use when a human should review every phase)

The orchestrator persona: one session coordinates only; all artifacts come from specialists; mandatory human pause checkpoints gate every phase transition. The session does NOT write or edit source files — all implementation goes through subagents.

**Mandatory pause checkpoints:**
1. **Missing brief** — draft skeleton, pause for user fill-in.
2. **After audit** — user reviews affected-files table, blast-radius tier, and flagged risks. May amend tier before "go."
3. **On any specialist blocker** — Open question, test failure the specialist couldn't resolve in one fix attempt.
4. **After smoke** — user playtests before pr-shipper fires.
5. **At PR ship, High tier** — explicit "ship it" required.
6. **At auto-bumped tier** — if actual diff exceeds audit tier, pause regardless.

**Phase sequence (Mode B):**

After every phase, output:
```
=== Phase <N> complete: <phase-name> ===
Changed files:
  - <path:line — summary>

Open questions:
  - <bullets, or "none">

Next recommendation:
  - <what should happen next, including whether to pause>
```

| Phase | Runs when | Subagent | Pause behavior |
|-------|-----------|----------|----------------|
| 1 — Audit | Always | `auditor` | **PAUSE** for user review of tier + affected-files |
| 2 — Protocol | `src/shared/protocol.ts` in affected-files | `protocol-steward` | Autonomous on clean return; PAUSE on blocker |
| 3 — Phone | `src/phone/` files in affected-files | `phone-puzzle-author` | Autonomous on clean return; PAUSE on blocker |
| 4 — Phaser | `src/game/` files in affected-files | `phaser-scene-author` | Autonomous on clean return; PAUSE on blocker |
| 5 — Smoke | Always (if any implementer ran) | `smoke-runner` | **PAUSE** for user playtest |
| 6 — PR ship | Always last | `pr-shipper` (include blast-radius tier) | Per §2 gates |

**Autonomous transitions (no pause in Mode B):**
1. Audit → next implementer phase after user says "go."
2. Implementer → next implementer if return is clean (no Open questions, typecheck passes).
3. Last implementer → smoke-runner autonomously.
4. pr-shipper, Low tier → auto-commit + auto-push + auto-PR.
5. pr-shipper, Medium tier → auto-commit, then 30s proceed-by-default.

**Dispatching mechanics (Mode B):**
1. Fill `.claude/templates/phase-brief.md` for this phase: scope ID, audit path, brief path, blast-radius tier (Phase 6 only), what to do, out-of-scope reminder, return format.
2. Use `subagent_type: "general-purpose"`. The `.claude/agents/*.md` files are role templates, NOT subagent types — embed them inline as `HARD RULES — self-enforce`.
3. Embed the specialist's full role prompt at the TOP of the dispatch.
4. Always include: scope ID, absolute paths to brief + audit, 4-section return format, out-of-scope reminder.

**Project-specific reminders to embed in every dispatch:**
- "Inherit the root `CLAUDE.md` conventions."
- "TypeScript strict mode — no `any`, no unused locals/params."
- "Run `npm run typecheck` before declaring done."
- "Don't add dependencies."
- "Don't commit, don't push, don't touch `BACKLOG.md` or `.claude/`. The orchestrator and pr-shipper handle those."
- "Return the 4-section digest (Done / Changed files / Open questions / Next recommendation)."
- "If your work would touch `server/server.ts`, STOP and surface as Open question."
- "If scope is power-related, remember the four-side rule."

**Mode B session prompt (Path B in `.claude/session-start.md`):**
```
I'm the owner of constellation. Please act as the high-oversight orchestrator (Mode B).

Read .claude/orchestrator.md end-to-end and adopt §3 Mode B as your operating mode.
Read CLAUDE.md and BACKLOG.md as standing context.

The backlog item I want to ship is: <SCOPE ID OR KEBAB SLUG>

If docs/scopes/<kebab-id>/brief.md doesn't exist, draft a skeleton and pause.
If it exists, dispatch the auditor and pause for my review.
```

---

## §4 Precedence

**§1 invariants and §2 gates always win — over both modes.**

- In Mode B, the mandatory human pause checkpoints enforce the gates explicitly.
- In Mode A, the session self-checks the gates and decides whether to proceed — but the gate thresholds (High tier → pause, auto-bump → pause, `server.ts` changes → surface) are non-negotiable regardless of mode.
- Mode B's "orchestrator never writes source" constraint does **not** apply to Mode A.
- Mode B's mandatory pause-after-audit and pause-after-smoke do **not** apply to Mode A. The session self-checks and proceeds if clean.
- When in doubt about which mode applies: if no mode was specified in the session prompt, default to Mode A (autonomous) for workflow/agentic runs and Mode B for sessions where the user is actively present.

---

## Scope resolution (both modes)

**Input:** a single scope ID — the exact `### [Type] Title` heading from `BACKLOG.md`, or a kebab-case slug.

**Resolve:**
1. Read `BACKLOG.md`, find the matching item under `## Open` or `## In Progress`.
2. Scope directory: `docs/scopes/<kebab-id>/`. Brief at `docs/scopes/<kebab-id>/brief.md`; audit at `docs/scopes/<kebab-id>/audit.md`.

**If brief doesn't exist:**
1. Draft skeleton at `docs/scopes/<kebab-id>/brief.md` using `.claude/templates/phase-brief.md`.
2. Fill in the BACKLOG item's Why/Acceptance/Size; add a "Design decisions to lock" section with `TODO:` placeholders and any context provided at invocation.
3. **PAUSE — both modes.** A missing brief is a hard gate. Autonomous runs do not skip this.

**If brief exists:** read it end-to-end, confirm coherence, then proceed to audit.

---

## Mid-flight recovery (both modes)

1. Sync: `git fetch origin && git status --branch`.
2. Read `docs/scopes/<kebab-id>/audit.md` — blast-radius tier and affected-files table.
3. Check disk state: `git status`, `git log --oneline -10`.
4. Match disk state to the phase sequence — which phases already ran?
5. Resume at the next unrun phase, or re-dispatch if a phase's work was undone.
6. If state is genuinely ambiguous, surface to user before proceeding.

---

## "Are you done?" status (both modes)

Respond with:
- Current scope ID
- Current phase (N — name)
- Phases completed (one-line summary each)
- What's blocking, if anything
- Next recommended action

Under 15 lines.
