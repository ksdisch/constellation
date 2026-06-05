# Constellation — Orchestrator Prompt: M4 Hub Foundation

You are the orchestrator for the **M4 hub foundation** — generalizing today's hardcoded `LevelScene` into a data-driven `PlanetScene` and introducing a new `HubScene` that selects which planet to play. Planet 2 (ice) and Planet 3 (library) are **out of scope** for this branch; each gets its own orchestrator-prompt later. You coordinate; you do **not** implement.

## Context (read this first)

M3 shipped the spellbook trio (Freeze Stars, Summon Platform, Illuminate) and the M3 cleanup pass (3s freeze prose, in-scene restart, `?solo=1` solo mode). All merged to `main` via PRs #1 and #3. Branch for this work: `feat/m4-hub-foundation` (cut from `main` after PR #3).

The plan doc (`~/.claude/plans/i-ve-started-this-in-fluttering-tiger.md`) describes M4 as:

> "Hub scene: cartoon galaxy map with planet nodes. Planet 2 (ice theme) + Planet 3 (library theme), each themed puzzle/power variants."

The plan-doc's intended repo structure names `Hub.ts` for the galaxy map and a generic `Planet.ts` for a polymorphic level scene. Today's `Level.ts` is hardcoded for a single planet. This orchestrator handles the foundation: refactor Level → data-driven Planet + introduce Hub. Planet 2 and 3 layer on top in later branches.

## Role boundary (strict)

- You may: read files, plan, dispatch phases via the Task tool to fresh subagents (`subagent_type: "general-purpose"` — the `.claude/agents/*.md` files are role templates, not resolvable subagent types; embed the rules inline as "HARD RULES — self-enforce"), summarize results, propose commits, and decide when to pause for user input.
- You may **not**: write or edit source files yourself. All implementation work goes through subagents.
- You may write scratch notes under `.claude/notes/`. Never edit `src/`, `server/`, or root config directly.

## Pre-decided design (locked in with user — do not re-litigate)

The following choices were locked with the user before this orchestrator-prompt was written. Subagents must implement to these specs; do not propose alternatives mid-flight.

1. **Refactor first, hub second.** Generalize `Level.ts` → data-driven `Planet.ts` (scene key `'Planet'`) BEFORE building Hub. The Hub then launches a planet via `scene.start('Planet', { net, config, solo?, unlockedPlanets })`. Cleaner foundation than building Hub on top of a hardcoded Level.

2. **PlanetConfig location:** `src/game/planets/planet1.ts` exports both the `PlanetConfig` type and the `planet1Config` value. When Planet 2 lands, the type lifts to `src/game/planets/types.ts` (deferred).

3. **PlanetConfig shape (Phase 1 — position-only; theme/color comes when Planet 2 lands):**

   ```ts
   export type PlanetConfig = {
     id: string;                                   // 'planet-1'
     name: string;                                 // user-visible: 'Constellation'
     hint: string;                                 // subtitle text
     spawn: { x: number; y: number };
     goal: { x: number; y: number };
     pit: { startX: number; endX: number };
     corridor: { x: number };
     platformDrop: { x: number; y: number };
     hiddenPlatform: { x: number; y: number };
     darkZone: { x: number; y: number; width: number; height: number };
     fallRespawnY: number;
   };
   ```

4. **Shared (non-per-planet) constants stay at module scope** in `Planet.ts`: `FREEZE_DURATION_MS = 3000`, `PLATFORM_LIFETIME_MS = 5000`, `PLATFORM_FADE_OUT_MS = 800`, `DARK_ZONE_FADE_MS = 800`. These describe power behavior, not level layout, so they don't go in `PlanetConfig`.

5. **Hub visual:** starry background (15–25 scattered `Phaser.GameObjects.Arc` dots in white/light tones with varied sizes 1–3px), a "Pocket Galaxy" title at the top (matching the existing `system-ui` 22px title style from today's Level), and three planet nodes arranged horizontally:
   - **Planet 1:** `Phaser.GameObjects.Arc` 40px radius, color `#7ad8ff` (cyan, matching Freeze accent), label "Constellation" below the circle in 16px system-ui white. Interactive with `useHandCursor: true`.
   - **Planet 2 (placeholder):** 30px radius, color `#3a3a4a` (muted gray), label "?" in 16px system-ui dimmed `#a8b0d8`. NOT interactive.
   - **Planet 3 (placeholder):** same as Planet 2 — gray "?" placeholder.
   - Layout: centered around (480, 270), 250px gaps between centers. Planet 1 at x=230, Planet 2 at x=480, Planet 3 at x=730.

6. **Hub interaction:** clicking the Planet 1 node calls `this.scene.start('Planet', { net: this.net, config: planet1Config, solo: this.solo, unlockedPlanets: this.unlockedPlanets })`. Clicking placeholder nodes does nothing (no `setInteractive`).

7. **Unlock state — in-memory only.** A `Set<string>` of planet IDs is threaded through Hub → Planet → Hub. Initial set when Hub first appears: `new Set(['planet-1'])`. This orchestrator does NOT add the win-unlocks-next mechanism — it lands when Planet 2 does. The data plumbing is in place; the unlock-on-win logic is a no-op for now.

8. **Win screen — two side-by-side buttons** (replaces today's single "Play again"):
   - **"Play again"** (left, at roughly x=380, y=310): keeps the Phase-2-shipped mint `#98ffc8` style. Calls `this.scene.restart({ net, config, solo, unlockedPlanets })` to preserve all state across restart.
   - **"Return to Hub"** (right, at roughly x=580, y=310): same 180×48 dimensions, different color — slate `#a8b0d8` — so the two buttons are visually distinct. Calls `this.scene.start('Hub', { net, solo, unlockedPlanets })`.
   - Both have `useHandCursor: true`. Labels in bold dark-navy `#1a1b3a` 18px (matching the Phase-2 button style).

9. **Scene flow:**
   - **Normal co-op:** Boot → Lobby → Hub → Planet (selected) → win → "Return to Hub" or "Play again".
   - **Solo (`?solo=1`):** Boot → Hub → Planet (no Lobby). 1/2/3 keys still register only inside Planet (Hub has no keyboard handlers).

10. **Boot.ts + Lobby.ts updates:** Boot's solo branch starts `'Hub'`. Lobby's `scene.start('Level', { net: this.net })` becomes `scene.start('Hub', { net: this.net, solo: false, unlockedPlanets: new Set(['planet-1']) })`. No other Lobby changes.

11. **No protocol or server changes.** Hub state is purely client-side. The relay doesn't know about planets. `src/shared/protocol.ts` and `server/server.ts` stay untouched.

12. **No new dependencies.** Stack remains Phaser, React, ws, Vite, tsx, TypeScript.

13. **Astronaut + Starglow companion:** the plan mentions a Starglow companion orb on-screen; **deferred to M5 polish.** Not in M4 scope.

14. **Persistence:** in-memory only for M4. localStorage / save files are an M5 concern. The `[Exploration] Decide on session persistence` backlog item stays in `## Open` (this orchestrator doesn't claim to resolve the broader question, only locks the M4 stance).

## Cross-cutting rules (re-stated for every subagent dispatch)

Every dispatch must embed these as **HARD RULES — self-enforce** in the prompt:

- Inherit the root `CLAUDE.md` conventions.
- Do **not** modify `src/shared/protocol.ts` or `server/server.ts`. M4 is client-side only.
- Do **not** add dependencies.
- Inline styles only on the phone side (not applicable this orchestrator — phone untouched throughout).
- Run `npm run typecheck` before declaring done.
- Don't refactor existing power code (Freeze / Summon / Illuminate behavior). The refactor is `Level.ts` → `Planet.ts` only — same power logic, same exhaustiveness check, just renamed and config-driven.
- Don't commit, don't push, don't touch `BACKLOG.md` or `.claude/`. Orchestrator handles those.
- Return the 4-section digest (Done / Changed files / Open questions / Next recommendation).

## Phases (sequential — one fresh subagent per dispatch)

After each phase: print the 4-section digest and **PAUSE for user acknowledgement** before dispatching the next.

### Phase 1 — Level → Planet data-driven refactor

- **Subagent:** `general-purpose` (embed phaser-scene-author rules).
- **Goal:** Turn today's hardcoded `LevelScene` into a data-driven `PlanetScene` taking a `PlanetConfig`. The game still plays end-to-end after this phase (no Hub yet — Boot/Lobby route to Planet directly with `planet1Config`).
- **Files in scope:**
  - **Create:** `src/game/planets/planet1.ts` — export `PlanetConfig` type and `planet1Config` value extracted verbatim from today's `Level.ts` constants. Pulls in: `SPAWN`, `GOAL_POS`, `PIT`, `CORRIDOR_X` (as `corridor.x`), `PLATFORM_POS` (as `platformDrop`), `HIDDEN_PLATFORM_POS` (as `hiddenPlatform`), `DARK_ZONE`, `FALL_RESPAWN_Y` (as `fallRespawnY`). Adds `id: 'planet-1'`, `name: 'Constellation'`, and `hint` set to today's Level subtitle text ("Freeze her past the plasma column, bridge the chasm, then illuminate the hidden path.").
  - **Rename + Edit:** `src/game/scenes/Level.ts` → `src/game/scenes/Planet.ts`. Class rename `LevelScene` → `PlanetScene`. Scene key `'Level'` → `'Planet'`. `init` signature becomes `init(data: { net: GameNetClient; config: PlanetConfig; solo?: boolean; unlockedPlanets?: Set<string> })`. Store `config` and `unlockedPlanets` on the scene (`private config!: PlanetConfig; private unlockedPlanets: Set<string> = new Set()`). Replace every hardcoded position read with `this.config.<field>`. The shared constants (`FREEZE_DURATION_MS`, `PLATFORM_LIFETIME_MS`, `PLATFORM_FADE_OUT_MS`, `DARK_ZONE_FADE_MS`) stay at module scope. Replace the hardcoded title "Constellation" and the long subtitle string with `this.config.name` and `this.config.hint` respectively.
  - **Edit:** `src/game/main.ts` — import `PlanetScene` (not `LevelScene`); update the scene-registration array.
  - **Edit:** `src/game/scenes/Boot.ts` — solo branch changes from `scene.start('Level', { net, solo: true })` to `scene.start('Planet', { net, config: planet1Config, solo: true, unlockedPlanets: new Set(['planet-1']) })`. Import `planet1Config` from `../planets/planet1`.
  - **Edit:** `src/game/scenes/Lobby.ts` — line 66 (`this.scene.start('Level', { net: this.net });`) becomes `this.scene.start('Planet', { net: this.net, config: planet1Config, unlockedPlanets: new Set(['planet-1']) });`. Import `planet1Config` from `../planets/planet1`.
- **Requirements:**
  - The Planet's win-screen restart button (the Phase-2-shipped one) must now call `this.scene.restart({ net: this.net, config: this.config, solo: this.solo, unlockedPlanets: this.unlockedPlanets })` to preserve all state across restart.
  - The "Return to Hub" button is **NOT** added in this phase — it lands in Phase 2 alongside the Hub scene.
  - Solo badge stays as-is.
  - Existing `castPower()` and exhaustiveness check are preserved verbatim.
  - No changes to phone client, protocol, or server.
- **Success criteria:** `npm run typecheck` passes. Subagent confirms: the existing Lobby → Planet 1 flow plays unchanged end-to-end (same sprites, physics, powers, win path); solo flow works unchanged (boots to Planet 1 directly, no Hub yet); win screen still has just the "Play again" button (Hub button is Phase 2).

### Phase 2 — Hub scene + win → Hub flow

- **Subagent:** `general-purpose` (embed phaser-scene-author rules).
- **Goal:** Introduce the Hub scene, thread it into Boot/Lobby/Planet, and add the "Return to Hub" win-screen button.
- **Files in scope:**
  - **Create:** `src/game/scenes/Hub.ts` — Phaser scene, key `'Hub'`. `init(data: { net: GameNetClient; solo?: boolean; unlockedPlanets: Set<string> })` stores all three on the scene. `create()` builds the starry background, title, and three planet nodes per locked design point 5. Imports `planet1Config` from `../planets/planet1`. On Planet 1 click: `this.scene.start('Planet', { net: this.net, config: planet1Config, solo: this.solo, unlockedPlanets: this.unlockedPlanets })`. The astronaut sprite is NOT visible on the Hub.
  - **Edit:** `src/game/scenes/Planet.ts` — in `showWin()`, alongside the existing "Play again" button, add a second 180×48 button at roughly (580, 310) labeled "Return to Hub" with slate `#a8b0d8` rect and bold dark-navy `#1a1b3a` 18px label. Move "Play again" left to roughly (380, 310) so the two sit side-by-side. Wire "Return to Hub" `pointerdown` to `this.scene.start('Hub', { net: this.net, solo: this.solo, unlockedPlanets: this.unlockedPlanets })`. Both buttons get `useHandCursor: true`.
  - **Edit:** `src/game/main.ts` — import and register `HubScene`. Scene array order: `[BootScene, LobbyScene, HubScene, PlanetScene]`.
  - **Edit:** `src/game/scenes/Boot.ts` — solo branch now starts `'Hub'` (not `'Planet'`) with `{ net, solo: true, unlockedPlanets: new Set(['planet-1']) }`. The `planet1Config` import added in Phase 1 can be removed from Boot.ts (no longer needed there).
  - **Edit:** `src/game/scenes/Lobby.ts` — `scene.start('Planet', ...)` becomes `scene.start('Hub', { net: this.net, solo: false, unlockedPlanets: new Set(['planet-1']) })`. The `planet1Config` import added in Phase 1 can be removed from Lobby.ts.
- **Requirements:**
  - Hub does NOT call any websocket method on `net`. The `net` parameter is purely threaded through to Planet's `init`.
  - For locked nodes (Planet 2 and 3 placeholders): use `Phaser.GameObjects.Arc` (do **not** call `setInteractive`). Label "?" in dimmed text. No hover cursor.
  - Solo state passes Hub → Planet via `scene.start` data; the existing Phase-2 restart and the new "Return to Hub" both forward solo so dev mode persists.
  - SOLO badge does NOT need to render on the Hub itself (Hub has no keyboard handlers anyway). It re-appears when the dev enters Planet.
  - No phone-side, protocol, or server changes.
- **Success criteria:** `npm run typecheck` passes. Subagent describes the visual: starry background, "Pocket Galaxy" title, three planet nodes (one cyan interactive + two gray locked). Subagent confirms full flow round-trips: normal co-op Lobby → Hub → Planet 1 → win → "Return to Hub" works; "Play again" still works; solo `?solo=1` → Hub → click Planet 1 → play → win → either button works. Mention any visual judgment calls (exact star count, title text, button gap) so the orchestrator can flag them.

### Phase 3 — Smoke + commits + BACKLOG move

- **Subagent:** none — orchestrator runs `npm run typecheck`, prints smoke instructions, proposes commits.
- **Smoke steps for user:**
  1. `npm run dev`. Open laptop at `localhost:5180` and `localhost:5180/?solo=1`.
  2. **Normal flow:** room-code handshake → Hub appears (does NOT auto-jump to Planet 1) → click cyan Planet 1 node → Planet 1 loads, plays end-to-end → win screen shows BOTH buttons → click "Return to Hub" → Hub re-appears, Planet 1 still selectable → click again → second playthrough works.
  3. **Play again still works:** beat Planet 1, click "Play again" instead → level rebuilds in place (dark zone re-darkens, chasm un-bridged), phone stays on spellbook.
  4. **Solo flow:** open `?solo=1` → no Lobby, Hub directly → click Planet 1 → SOLO badge appears, keys 1/2/3 work → win → "Return to Hub" → solo state preserved (Hub appears, click Planet 1, SOLO badge reappears, keys still work).
  5. **Negative checks:** clicking dimmed "?" placeholders does nothing. Keys 1/2/3 pressed while on the Hub do nothing.
  6. **Regression check:** all three M3 powers still work — freeze enemy, summon platform, illuminate. Win path still requires all three.
- **Commit proposal (three commits, matching the M3 cleanup per-phase rhythm):**
  - `refactor(m4): generalize Level scene into data-driven Planet scene` (Phase 1)
  - `feat(m4): galaxy hub scene with planet-node selection` (Phase 2)
  - `docs(m4): mark hub backlog item Done` (Phase 3 BACKLOG move)
- **BACKLOG move:** move the "Galaxy hub scene with planet nodes" item from `## In Progress` (where this scaffolding commit moves it) to `## Done` with `Completed: 2026-05-14`. Add a Note describing what shipped: data-driven `PlanetScene` + `HubScene` with one playable planet and placeholder nodes for Planets 2 and 3; in-memory unlock state; "Return to Hub" button on the win screen.

## Out-of-repo follow-ups (orchestrator surfaces in Phase 3 digest)

- The plan doc still says "freezes for 5s" — pending the user's manual update (carried over from M3 cleanup).
- The phone-linked indicator cosmetic quirk in solo mode — still pending if the user wants it polished (carried over from M3 cleanup).
- Neither blocks M4.

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
