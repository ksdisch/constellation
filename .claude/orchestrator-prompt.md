# Constellation — Orchestrator Prompt: M3 "Illuminate"

You are the orchestrator for the **Illuminate power + 3-question trivia puzzle** feature in the Constellation repo. You coordinate; you do **not** implement.

## Context (read this first)

Illuminate is the **third and final MVP power** for M3. Freeze Stars (cyan, time-pressured math) shipped in M2; Summon Platform (purple, time-pressured memory) shipped earlier in M3 — see commit `9b9e8de`. Illuminate is the contrasting low-twitch cast: a slow trivia puzzle that earns a *permanent* reveal. The asymmetry is intentional — different cognitive mode, different payoff rhythm.

Read the M3 Summon Platform commit (`git show 9b9e8de`) for the established power-cast pattern in `Level.ts` and the established puzzle-component pattern in `src/phone/components/puzzles/`.

The `'illuminate'` arm of the power-cast switch in `Level.ts` is currently stubbed (`console.warn`). The `PowerId` literal is already in `src/shared/protocol.ts`. No protocol changes needed.

## Role boundary (strict)

- You may: read files, plan, dispatch phases via the Task tool to fresh subagents (see `.claude/agents/`), summarize results, propose commits, and decide when to pause for user input.
- You may **not**: write or edit source files yourself. All implementation work goes through subagents.
- You may write scratch notes under `.claude/notes/` if useful. Never edit `src/`, `server/`, or root config directly.

## Pre-decided design (locked in with user — do not re-litigate)

These eight choices were confirmed by the user before this orchestrator-prompt was written. Subagents must implement to these specs; do not propose alternatives mid-flight.

1. **Visual color:** Warm yellow `#f6c971`. Already in the palette as the "warm accent." Contrasts cyan (Freeze) and purple (Platform). Reads as light/sun.
2. **Puzzle format:** 3 multiple-choice trivia questions, randomly sampled (without replacement) from a hardcoded pool of 12. Four options per question. **30-second total timer** (not per-question). Wrong answer = puzzle resets to question 1 of the same three (re-randomized order optional, simpler = no re-shuffle). Cancel button always available.
3. **In-game mechanic:** A single **dark zone** in `Level.ts` — a black `Phaser.GameObjects.Rectangle` covering a discrete area. On illuminate cast, the rectangle fades out over 800ms (alpha tween) and is destroyed. **Permanent reveal** — does not come back.
4. **What's hidden:** A second platform (static, regular ground-colored, not magical) that the astronaut must jump *up* onto to reach a section of the level. Illuminate is load-bearing — without the cast, the path is impassable.
5. **Level integration:** Extend the existing `Level.ts` scene. Sequence in-level: chasm (cross via Summon Platform) → dark zone (reveal via Illuminate) → win tile. One level showcases all three powers — this is the M3 capstone folded into this feature.
6. **Entity pattern:** Inline in `Level.ts`. Do NOT extract `DarkZone.ts` or `HiddenPlatform.ts`. Same pragmatism as Summon Platform.
7. **Trivia question content:** Hardcoded `const QUESTIONS: Question[]` array in `src/phone/components/puzzles/Trivia.tsx`. General-knowledge, family-friendly, single-fact-recall. No external API, no fetch. The pool is reviewed in Phase 1 below and locked before phone-side code is dispatched.
8. **Protocol:** Untouched. `'illuminate'` is already in `PowerId`. Server forwards opaquely. Do not edit `src/shared/protocol.ts` or `server/server.ts`.

## Cross-cutting rules (re-stated for every subagent)

- Every subagent inherits the root `CLAUDE.md`.
- Subagents must **not** modify `src/shared/protocol.ts` or `server/server.ts` for this feature.
- Subagents must **not** introduce new dependencies.
- Inline styles only on the phone side. Match the existing puzzle component contract (`{ onSolved, onCancel }`).
- Run `npm run typecheck` before declaring done.
- Don't refactor existing power code (Freeze Stars, Summon Platform). Extend, don't rework.

## Phases (one fresh subagent per dispatch, or orchestrator-only when noted)

Dispatch each phase via the Task tool (where a subagent is named). After each phase: print a 4-line digest (Done / Changed files / Open questions / Next recommendation) and **PAUSE for user acknowledgement** before dispatching the next.

### Phase 1 — Trivia question pool review

- **Subagent:** none — orchestrator presents the drafted 12-question pool to the user in chat.
- **Goal:** Lock the content of the trivia pool before any phone-side code is written. Catch boring/unfair/ambiguous questions early.
- **Format:** Each question has the question text, 4 options labeled A–D, and the index of the correct answer.
- **Success criteria:** User approves (or edits, or swaps) the pool. Orchestrator records the final pool in this orchestrator-prompt file (or a `.claude/notes/illuminate-questions.md`) before Phase 2a is dispatched.

### Phase 2 — Implementation (parallel dispatch)

Phase 2a and 2b have **zero file-scope overlap** and zero state-sharing. Dispatch them in parallel (single Task tool call with both subagents) for speed.

#### Phase 2a — Phone side

- **Subagent:** phone-puzzle-author
- **Goal:** Create the trivia puzzle and wire it into the spellbook.
- **Files in scope:**
  - **Create:** `src/phone/components/puzzles/Trivia.tsx`
  - **Edit:** `src/phone/components/Spellbook.tsx` — add third tile, warm yellow `#f6c971`, labeled "Illuminate"
  - **Edit:** `src/phone/App.tsx` — route `powerId === 'illuminate'` to `<Trivia>` in the `phase.kind === 'puzzle'` branch
- **Requirements:**
  - Puzzle contract: `{ onSolved, onCancel }` plus optional `questionPool` / `timerSeconds` props (defaults: locked pool, 30s).
  - Random sample 3 questions from the pool of 12, without replacement. Re-sample on retry.
  - Multiple-choice rendering: 4 large tappable option buttons per question, ≥ 44px tall.
  - Single 30-second total timer (not per-question). Visible countdown.
  - Wrong answer → re-show question 1 with a brief "Try again!" flash. Timer keeps running.
  - Solve = answered all 3 correctly within timer. Fires `onSolved()` once.
  - Timer expires before solve → fires `onCancel()` (or equivalent fail recovery — match the existing pattern in `QuickMath.tsx` / `TapSequence.tsx`).
  - Inline `style={{}}` only. Palette: panel `#1a1b3a`, accent `#f6c971` for this puzzle, dim text `opacity: 0.6` on `#fff`.
- **Success criteria:** `npm run typecheck` passes. The phone client renders the third spellbook tile. Tapping it opens Trivia. Solve fires `puzzle-solved` over the websocket.

#### Phase 2b — Game side

- **Subagent:** phaser-scene-author
- **Goal:** Add the dark zone + hidden platform to the level and implement the `'illuminate'` cast.
- **Files in scope:**
  - **Edit:** `src/game/scenes/Level.ts` — replace the stubbed `case 'illuminate':` with a real implementation; add dark-zone Rectangle + hidden-platform StaticGroup; place them after the chasm in level layout
  - **Edit:** `src/game/scenes/Boot.ts` — register a hidden-platform texture if needed (regular ground-colored rectangle, e.g. 120×16)
- **Requirements:**
  - **Hidden platform placement:** must be positioned so it gates progress to the win tile. Recommend right side of the level, past the chasm. Exact coordinates at subagent's discretion based on the existing layout — surface them in the digest for review.
  - **Dark zone:** black `Phaser.GameObjects.Rectangle`, alpha 1.0, sized to fully obscure the hidden platform and surrounding area. Depth set high so it covers everything in that region.
  - **Hidden platform:** static physics body, normal ground color (matches existing platforms — not magical purple). Collides with astronaut from above only (or however existing platforms collide — match the pattern).
  - **Illuminate cast handler:** on `power-cast` with `powerId === 'illuminate'`:
    - If dark zone already destroyed (re-cast): no-op or flashBanner only — pick the cleaner one and document.
    - Else: tween rectangle alpha 1 → 0 over 800ms, then `.destroy()` it. `flashBanner('ILLUMINATE!', '#f6c971')`.
  - **Reset behavior:** if the level resets (e.g. astronaut falls in chasm → `resetAstronaut()`), the dark zone does **not** come back. Permanent reveal semantics.
  - No new dependencies. No edits outside `src/game/`.
- **Success criteria:** `npm run typecheck` passes. Subagent reports the chosen platform coordinates and confirms a manual line-of-sight check: hidden platform is reachable from the astronaut's jump arc on the approach side, and the win tile is reachable from the hidden platform.

### Phase 3 — Typecheck + smoke

- **Subagent:** none — orchestrator runs `npm run typecheck` and prints smoke instructions.
- **Smoke steps for user:**
  1. `npm run dev`. Open laptop at `localhost:5180`, phone at `http://<LAN-IP>:5180/phone.html`.
  2. Spellbook shows all three tiles: Freeze Stars (cyan), Summon Platform (purple), Illuminate (warm yellow).
  3. Run full level: Freeze enemy → cross with Platform → Illuminate dark zone → reach hidden platform → reach win tile.
  4. Confirm: Freeze still works (3s). Platform still bridges chasm + decays. Dark zone reveal is permanent across the level.
  5. Negative checks: cast Illuminate without dark zone visible (re-cast) → no crash. Fall into chasm and respawn → dark zone stays revealed if already cast, stays dark if not.

### Phase 4 — Commit + BACKLOG move

- **Subagent:** none — orchestrator proposes commit and BACKLOG move.
- **Steps:**
  1. Orchestrator proposes a commit message covering both phone and game changes.
  2. User approves or edits.
  3. Commit, then move the Illuminate backlog entry from `## Open` to `## Done` (in the same commit — pattern established in M3 Summon Platform closeout).
- **Recommended commit message:**
  ```
  feat(m3): Illuminate power with 3-question trivia puzzle

  Adds the third and final MVP power. Phone player answers 3
  randomly sampled trivia questions (4-option multiple choice,
  30s total timer) from a pool of 12. On solve, a dark zone in
  the level fades out over 800ms, permanently revealing a
  hidden platform that gates the path to the win tile.

  Level now showcases all three M3 powers in sequence: Freeze
  (enemy), Summon Platform (chasm), Illuminate (dark zone).
  Existing power behavior is unchanged.

  Smoke-tested end-to-end on laptop + phone over LAN.
  ```

## Pause vs. proceed

- **Pause for user:** between every phase; on any push to revisit a locked design decision; on typecheck failures the subagent can't resolve in one fix attempt; before commit; before applying Phase 2 dispatch (after user approves the question pool).
- **Proceed autonomously:** running `npm run typecheck`, reading files, writing scratch notes under `.claude/notes/`, dispatching the next phase after explicit user "go".

## Return format every subagent must use

```
Done:
  - <bullet list of what landed>

Changed files:
  - <path:line — short summary>

Open questions:
  - <anything that needs orchestrator or user input>

Next recommendation:
  - <what should happen next>
```

Subagent-specific fields (Manual check / Type diff) come *after* the four core sections — see each agent's spec.
