# Constellation — Orchestrator Prompt: M3 Cleanup Bundle

You are the orchestrator for a **bundled M3 cleanup pass** before M4 (the Galaxy hub) starts. Three small items, all touching `Level.ts`. You coordinate; you do **not** implement.

## Context (read this first)

M3 shipped: Freeze Stars, Summon Platform, Illuminate, plus a capstone level that sequences all three. PR #1 is merged to `main`. This cleanup bundle clears three S-sized items from `BACKLOG.md` before the M4 architectural shift:

1. **Freeze duration drift** — Plan doc says 5s; code and phone copy ship at 3s; only `README.md` still says 5s.
2. **Restart button** — Win screen currently says "Refresh to play again."; replace with an in-scene restart.
3. **Solo dev mode** — Debug toggle so the laptop can fire powers without a phone for level iteration.

The phases are **sequential, not parallel**: all three touch `src/game/scenes/Level.ts`, and Phase 3 builds on a small refactor that's natural to land in Phase 2's wake.

Branch: `feat/m3-cleanup` (cut from `main` after PR #1's squash-merge).

## Role boundary (strict)

- You may: read files, plan, dispatch phases via the Task tool to fresh subagents (`subagent_type: "general-purpose"` — the `.claude/agents/*.md` files are role templates, not resolvable subagent types; embed the rules inline as "HARD RULES — self-enforce"), summarize results, propose commits, and decide when to pause for user input.
- You may **not**: write or edit source files yourself. All implementation work goes through subagents.
- You may write scratch notes under `.claude/notes/` if useful. Never edit `src/`, `server/`, or root config directly.

## Pre-decided design (locked in with user — do not re-litigate)

These eight choices were confirmed by the user before this orchestrator-prompt was written. Subagents must implement to these specs; do not propose alternatives mid-flight.

1. **Freeze drift — canonical value:** 3s wins (the shipped value). M2 playtested at 3s; `Level.ts:7 FREEZE_DURATION_MS = 3000` and `App.tsx:11 "enemies cold for 3s"` already agree. Drift is entirely in stale prose.
2. **Freeze drift — in-repo fix:** Update `README.md:7` only (the one line saying "freezes for 5s" → "freezes for 3s"). No code change.
3. **Freeze drift — out-of-repo plan doc:** Flagged for the user to update manually (`~/.claude/plans/i-ve-started-this-in-fluttering-tiger.md`). Out of scope for this branch.
4. **Restart button — where:** Win screen only. Fall-respawn already auto-resets via `resetAstronaut()`; no UX problem there.
5. **Restart — mechanism:** `this.scene.restart()` in `LevelScene`, triggered by a clickable button/text on the win overlay. No full page reload. The `GameNetClient` is constructed outside the scene and passed in via `init(data.net)`, so the websocket survives the restart.
6. **Restart — phone-side:** No protocol change, no phone-side code change. After a winning cast the phone is already back on the spellbook via `cast-feedback` timeout. The relay/connection is unchanged across a scene restart.
7. **Solo dev mode — activation:** URL param `?solo=1` on the laptop URL (`localhost:5180/?solo=1`). Parsed in `BootScene` (or `main.ts`); if true, skip `LobbyScene` and start `LevelScene` directly with a stub-disconnected `GameNetClient`.
8. **Solo dev mode — keybindings + relay bypass:** Keys `1` / `2` / `3` → Freeze / Summon / Illuminate. Bypass the relay entirely. Extract the inline `switch (msg.powerId)` body at `Level.ts:92–109` into `private castPower(id: PowerId)`; call it from both the websocket handler and a `keyboard.on('keydown-ONE'/'TWO'/'THREE')` handler. Keyboard handler is registered only when `this.solo === true` (passed via `init`). No UI changes anywhere — solo mode is a debug shortcut, not a UI surface.

## Cross-cutting rules (re-stated for every subagent dispatch)

Every dispatch must embed these as **HARD RULES — self-enforce** in the prompt:

- Inherit the root `CLAUDE.md` conventions.
- Do **not** modify `src/shared/protocol.ts` or `server/server.ts`. None of these items need wire-protocol changes.
- Do **not** add dependencies.
- Inline styles only on the phone side. (Not applicable this pass — phone side is untouched in all three phases.)
- Run `npm run typecheck` before declaring done.
- Don't refactor existing power code beyond the explicit `castPower()` extraction in Phase 3. Don't touch Freeze / Summon / Illuminate behavior.
- Don't commit, don't push, don't touch `BACKLOG.md` or `.claude/` — the orchestrator handles those.
- Return the 4-section digest (Done / Changed files / Open questions / Next recommendation).

## Phases (sequential — one fresh subagent per dispatch)

After each phase: print the 4-section digest and **PAUSE for user acknowledgement** before dispatching the next.

### Phase 1 — Freeze drift: README prose fix

- **Subagent:** `general-purpose` (trivial scope, but use a fresh dispatch for the audit-trail rhythm)
- **Goal:** Update `README.md` so the in-repo prose matches the shipped 3s freeze duration.
- **Files in scope:**
  - **Edit:** `README.md` — change the one line in the Status section that says "freezes for 5s" → "freezes for 3s"
- **Requirements:**
  - Scope is literally one line. Subagent must `grep -nE '5s|5 seconds|5000' README.md` first to confirm there's only one match in the Status paragraph and surface anything else it finds.
  - Also re-grep across `src/` for any stray `5000` or `5 seconds` referencing freeze duration (defensive — we don't expect any but should confirm zero matches).
  - No code touched.
- **Success criteria:** `npm run typecheck` still passes (sanity, since no code changed). README Status paragraph reflects 3s. Subagent reports the grep result for `5s` across the repo so we know nothing else hides.

### Phase 2 — Restart button on win screen

- **Subagent:** `general-purpose` (embed phaser-scene-author rules: scope is `src/game/` only, no protocol/server edits, no new deps, inline scene patterns).
- **Goal:** Replace "Refresh to play again." with an in-scene clickable restart that calls `this.scene.restart()`.
- **Files in scope:**
  - **Edit:** `src/game/scenes/Level.ts` — modify `showWin()` (Level.ts:211–231) to render a clickable button-style text in place of the current "Refresh to play again." line; wire its `pointerdown` (or `pointerup`) to `this.scene.restart()`.
- **Requirements:**
  - Use existing Phaser idioms: `this.add.text(...).setOrigin(0.5).setInteractive({ useHandCursor: true })` then `.on('pointerdown', () => this.scene.restart())`. Match the existing visual style (system-ui font, 16px or larger, dim text color or a subtle button background `Phaser.GameObjects.Rectangle` behind the text for affordance).
  - Hit target should be comfortably clickable — at least ~120×40 px of actual interactive area. Either set the text's `setInteractive` hit area explicitly or layer a rectangle behind it that takes the pointer events.
  - Confirm `this.scene.restart()` is sufficient (it re-runs `init` and `create`, rebuilds `astronaut`, `enemy`, `platforms`, `hiddenPlatforms`, `darkZone`, and resets `won` via `init`). No need to manually destroy anything.
  - The win overlay's dimmer rectangle, "Level complete!" text, and the new button should all be removed/recreated cleanly on restart (they'll be, since they're added in `create`/`showWin` and the scene restart tears the whole scene down).
  - Do **not** touch the fall-respawn path — that's already correct.
  - Do **not** change `App.tsx` or anything on the phone side.
- **Success criteria:** `npm run typecheck` passes. Subagent describes the visual: dimmer overlay, "Level complete!" text, restart button text/rect, hover/cursor affordance. Subagent confirms scene restart rebuilds the dark zone (i.e., re-darkens the hidden platform) and resets the chasm bridge — restart means restart, not "keep state."

### Phase 3 — Solo dev mode

- **Subagent:** `general-purpose` (embed phaser-scene-author rules: scope is `src/game/` only, no protocol/server edits, no new deps).
- **Goal:** Add a `?solo=1` URL-param toggle that boots straight into the level and lets keys `1/2/3` fire Freeze / Summon / Illuminate without a phone.
- **Files in scope:**
  - **Edit:** `src/game/scenes/Boot.ts` — at the end of `create()`, replace the unconditional `this.scene.start('Lobby')` with a branch: if `?solo=1` is present in `window.location.search`, construct a `GameNetClient` (do **not** call `.connect()` on it), then `this.scene.start('Level', { net: stub, solo: true })`. Else fall through to today's behavior.
  - **Edit:** `src/game/scenes/Level.ts` — extend `init` to accept an optional `solo?: boolean` and store it on the scene; extract the body of the existing `switch (msg.powerId)` at lines 92–109 into a `private castPower(powerId: PowerId)` method; have the existing `this.net.onMessage` handler delegate to `castPower`; in `create`, if `this.solo`, register `this.input.keyboard.on('keydown-ONE' | 'keydown-TWO' | 'keydown-THREE', ...)` handlers that call `this.castPower('freeze-stars' | 'summon-platform' | 'illuminate')`.
- **Requirements:**
  - `PowerId` is imported from `../../shared/protocol`. The extracted `castPower(powerId: PowerId)` preserves the existing `default: { const _exhaustive: never = powerId; void _exhaustive; }` exhaustiveness check.
  - In solo mode, **do not** connect the websocket. The unconnected `GameNetClient` is passed as `net` solely to satisfy the existing `init` contract; its `onMessage` registration in `Level.ts:85` will register a handler that never fires, which is fine.
  - Keyboard handlers must be registered **only** when `this.solo === true`. In non-solo runs, key `1/2/3` presses must do nothing (no accidental power firing during real co-op play).
  - Optional polish (not required): a small "SOLO" badge text on screen so the dev knows they're in solo mode. Subagent's call; if added, surface it in the digest.
  - No spellbook UI on the laptop. No phone-side change. No protocol change.
  - The `solo` flag should reset to `false` on a normal scene restart (Phase 2's restart button shouldn't accidentally keep us in solo state). Verify by inspecting whether `init` is called on `scene.restart()` — it is, and `init(data)` would carry `data` forward unless the restart explicitly passes new data. Pick the cleaner of: (a) `this.scene.restart({ net: this.net, solo: this.solo })` — keeps solo across restart, which is what a dev iterating on levels wants; or (b) `this.scene.restart()` and let `solo` default to false. Subagent: recommend (a) and document the choice in the digest.
- **Success criteria:** `npm run typecheck` passes. Subagent confirms:
  - `localhost:5180` (no param) → Boot → Lobby (normal flow, unchanged).
  - `localhost:5180/?solo=1` → Boot → Level directly, no lobby, no phone needed.
  - In solo, keys `1/2/3` cast the three powers; banner flashes match the websocket path exactly.
  - Restart button in solo mode resets the level AND preserves solo state (so keys still work post-restart).

### Phase 4 — Smoke + commit

- **Subagent:** none — orchestrator runs `npm run typecheck` and prints smoke instructions, then proposes commits.
- **Smoke steps for user:**
  1. `npm run dev`. Open laptop at `localhost:5180` (normal flow) and `localhost:5180/?solo=1` (solo flow).
  2. **Normal flow:** room-code handshake on phone, spellbook with all three tiles, full level (freeze → bridge → illuminate → win), restart button on win → level rebuilds, dark zone re-darkens, phone stays on spellbook.
  3. **Solo flow:** boots straight to Level, no room code visible. Press `1` → freeze banner + enemy freezes. Press `2` → platform banner + bridge appears. Press `3` → illuminate banner + dark zone fades. Walk to win tile → win screen → restart button → level rebuilds, still in solo, keys still work.
  4. **Negative checks (normal flow):** press `1`/`2`/`3` keys — nothing happens (keyboard handler not registered in non-solo).
  5. **README check:** scan README Status paragraph — reads "freezes for 3s."
- **Commit proposal:**
  - User's call: ship as three separate commits (`fix(m3): freeze duration prose drift`, `feat(m3): in-scene restart button`, `feat(m3): solo dev mode for level iteration`) OR one bundled commit (`chore(m3): cleanup pass — freeze prose, restart button, solo mode`).
  - **Recommend three separate commits** — they're three distinct backlog items with three distinct rationales, and the project's commit history is granular. Easier to revert one if M4 work surfaces a regression.
- **BACKLOG move:** in the final commit (or each per-item commit, the orchestrator's call when proposing), move all three entries from `## In Progress` to `## Done` with `Completed: 2026-05-13`.

## Out-of-repo task (orchestrator surfaces in Phase 4 digest, user handles manually)

The plan doc at `~/.claude/plans/i-ve-started-this-in-fluttering-tiger.md` likely says Freeze Stars freezes for 5s. The user updates that doc themselves after this branch lands. Orchestrator's job is to surface the exact phrase to grep for in the closeout digest.

## Pause vs. proceed

- **Pause for user:** between every phase; on any push to revisit a locked design decision; on typecheck failures the subagent can't resolve in one fix attempt; before any commit; before any push to origin.
- **Proceed autonomously:** running `npm run typecheck`, reading files, writing scratch notes under `.claude/notes/`, dispatching the next phase after explicit user "go".

## Return format every subagent dispatch must use

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
