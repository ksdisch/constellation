# constellation — Project Backlog

Unprioritized list of features, improvements, refactors, and ideas for this project.
Pick items with the `project-backlog` skill in Claude Code.

**Item types:** Feature · Improvement · Refactor · Rebuild · Exploration · Bug

**How to add an item:** Under `## Open`, create a new `### [Type] Title` heading and fill in Why, Acceptance, Size, and Added.

**Deferred ideas:** Higher-level explorations not yet ready to pick live in [`docs/ideas/`](docs/ideas/).

---

## Open

### [Exploration] Playtest M2 with girlfriend — the "is it fun?" gate
- **Why:** The plan explicitly names this as the critical gate before any M3 work. The whole asymmetric premise lives or dies here. If the loop doesn't feel fun, the power-to-puzzle pairing or the asymmetry itself may need to change before more code gets written.
- **Acceptance:** Play one full session (handshake → spellbook → Quick Math → freeze → run past enemy → win). Write down: did the cast feel rewarding? Was the puzzle the right difficulty? Did the 3-second freeze feel tight or generous? Did the pairing feel meaningful or arbitrary?
- **Size:** S
- **Added:** 2026-05-12

### [Feature] Galaxy hub scene with planet nodes
- **Why:** M4 in the plan. Connects multiple levels into a campaign arc and gives the project its cartoon-galaxy identity. Without it, each level is an island.
- **Acceptance:** New Phaser scene showing a starry galaxy map with planet nodes. Selecting a planet loads its level. At least one planet (the current corridor level, retitled) is reachable from the hub. Hub remembers which planets are unlocked (in-memory for now — persistence is a separate item).
- **Size:** L
- **Added:** 2026-05-12

### [Feature] Planet 2 — ice theme with themed puzzle/power variant
- **Why:** M4. First test of whether the planet-as-theme structure carries variety. Themed visuals + a twist on existing powers (e.g. slippery ground, freeze power chains across enemies).
- **Acceptance:** Second playable level with ice/snow tileset, at least one mechanic distinct from Planet 1, and a power-puzzle variant that feels themed (e.g. ice-themed math puzzle, or a sudoku with snowflake symbols).
- **Size:** L
- **Added:** 2026-05-12

### [Feature] Planet 3 — library theme with themed puzzle/power variant
- **Why:** M4. Second themed planet. Together with ice planet, validates whether 5–10 planets is realistic or if scope needs to shrink.
- **Acceptance:** Third playable level with library/book tileset, mechanic distinct from Planets 1 and 2, and a themed puzzle variant (e.g. Wordle-like for Illuminate, since reading fits the theme).
- **Size:** L
- **Added:** 2026-05-12

### [Feature] Polish pass — music, SFX, particles, screen shake, camera feel
- **Why:** M5. The thing that turns "a working prototype" into "show your friends." Plan calls out Incompetech/OpenGameArt as music sources, and notes camera feel as a known gap.
- **Acceptance:** Background music loops on the hub and during levels (different tracks). SFX on jump, cast, freeze, win. Particle burst on cast and on win. Screen shake on death. Camera that lerps to follow the astronaut instead of being static. Subjective bar: "feels juicy."
- **Size:** L
- **Added:** 2026-05-12

### [Feature] Deploy — relay to Fly.io (or Cloudflare DO), game client to itch.io
- **Why:** M5. The actual ship. Without deployment, the game can't leave your wifi.
- **Acceptance:** Relay server running on a free-tier host with a public wss:// URL. Game client built and uploaded as an itch.io HTML5 project, pointing at the deployed relay. End-to-end test: laptop on home wifi, phone on cellular, full co-op loop works.
- **Size:** M
- **Added:** 2026-05-12

### [Exploration] Decide on session persistence — save progress between sessions, or fresh each time?
- **Why:** Open question from the plan. Affects hub-unlock design, save-file format, and how playtests work (do you start from scratch each session?). Plan leaned "fresh for MVP" but worth a real decision before the hub lands.
- **Acceptance:** Written decision (in the plan doc or a new ADR-style note) on: persist or not, and if so, what to persist (unlocked planets only? puzzle stats?) and where (localStorage on the game client is simplest).
- **Size:** S
- **Added:** 2026-05-12

---

## In Progress

(none)

---

## Done

### [Feature] Solo dev mode — fake the phone side for solo level testing
- **Why:** Listed as an open question in the plan with a "lean yes" stance. Hugely useful for iterating on levels without scheduling co-op time. Without it, every level test requires two people and two devices.
- **Acceptance:** A debug toggle (URL param like `?solo=1`, or keyboard shortcut) that lets the laptop trigger powers directly — e.g. press `1` to fire freeze, `2` summon, `3` illuminate. Skips the relay; useful for level iteration only.
- **Size:** S
- **Added:** 2026-05-12
- **Started:** 2026-05-13
- **Completed:** 2026-05-13
- **Note:** Shipped as `?solo=1` URL param parsed in `BootScene` (constructs an unconnected `GameNetClient` stub, skips `LobbyScene`, starts `LevelScene` with `{ net, solo: true }`). Keys `1`/`2`/`3` map to Freeze / Summon Platform / Illuminate via an extracted `private castPower(powerId: PowerId)` shared with the wire handler — one switch, one exhaustiveness check. Top-left `SOLO  [1] freeze  [2] platform  [3] illuminate` badge renders only in solo. Keyboard handlers are not registered in normal co-op.

### [Improvement] Replace "Refresh to play again" with an in-game restart button
- **Why:** Current level-end UX (`src/game/scenes/Level.ts:225`) tells the player to refresh the browser. Workable for M2 smoke-testing, but jarring for actual playtesting and definitely not okay for itch.io release.
- **Acceptance:** Win screen has a "Play again" button that resets the scene without a full browser reload. Phone side stays connected and returns to the spellbook.
- **Size:** S
- **Added:** 2026-05-12
- **Started:** 2026-05-13
- **Completed:** 2026-05-13
- **Note:** Shipped as a 180×48 mint-green "Play again" button in `showWin()` wired to `this.scene.restart({ net: this.net, solo: this.solo })`. Hand-cursor on hover. The `net` and `solo` pass-through preserves the websocket and (when applicable) solo state across restarts. Restart re-runs `init`/`create`, so the dark zone re-darkens and the chasm is un-bridged — true restart, not state-keep.

### [Improvement] Sync freeze-duration drift between plan (5s) and code (3s)
- **Why:** Plan doc says Freeze Stars freezes enemies for 5 seconds; code ships at 3 seconds (`src/game/scenes/Level.ts:7` constant + `src/phone/App.tsx:11` copy). Not broken, but the source of truth is unclear. Resolve before tuning the other powers so timings are consistent.
- **Acceptance:** Either update the plan doc to match the 3s code (if 3s tuned better in M2 testing) or change the constant back to 5s. Phone "Cast!" copy and any docs reflect the chosen value.
- **Size:** S
- **Added:** 2026-05-12
- **Started:** 2026-05-13
- **Completed:** 2026-05-13
- **Note:** Shipped as one-line `README.md` prose fix ("5s" → "3s"). Code and phone copy already agreed at 3s. Defensive grep confirmed `README.md:7` was the only freeze-related "5s" in the repo. The plan doc at `~/.claude/plans/i-ve-started-this-in-fluttering-tiger.md` is the remaining out-of-repo update, handled manually by the user.

### [Feature] Add Illuminate power + 3-question trivia puzzle
- **Why:** Third and final MVP power. Low-twitch puzzle complements time-pressured math (Freeze) and tactile memory (Platform). Earns a *permanent* dark-zone reveal — different payoff rhythm from the other two casts.
- **Acceptance:** Phone spellbook shows Illuminate as a third power (warm yellow `#f6c971`). Tapping it opens a 3-question multiple-choice trivia puzzle (sampled from pool of 12, 30s total timer, wrong answer resets to question 1). On solve, a black rectangle covering a hidden platform in the level fades out over 800ms and stays revealed for the rest of the level. The hidden platform gates the path to the win tile, so Illuminate is load-bearing. Wire-protocol `illuminate` round-trips. Level showcases all three powers in sequence (chasm → dark zone → win).
- **Size:** M
- **Added:** 2026-05-12
- **Started:** 2026-05-12
- **Completed:** 2026-05-12
- **Note:** Re-cast after dark zone is destroyed fires the `ILLUMINATE!` banner only (no fade) — diverges intentionally from Summon Platform's silent no-op. Trivia is a 30s commitment; visible confirmation is appropriate. Win tile relocated from y=470 to y=300 to make Illuminate load-bearing per the locked design.

### [Feature] Design one level that requires all three powers to clear (M3 capstone)
- **Why:** M3 capstone — proves the spellbook concept works as a system, not just as three independent gimmicks.
- **Acceptance:** Single level where you cannot reach the goal without using Freeze Stars, Summon Platform, and Illuminate at least once each.
- **Size:** M
- **Added:** 2026-05-12
- **Completed:** 2026-05-12
- **Note:** Folded into the Illuminate feature. The existing Level scene now sequences all three powers: Freeze (enemy) → Summon Platform (chasm bridge) → Illuminate (dark zone hiding a load-bearing platform) → win tile. Reach math confirms the win tile is unreachable without Illuminate (direct jump misses by 21px); the chasm is uncrossable without Summon Platform.

### [Feature] Add Summon Platform power + Tap Sequence puzzle
- **Why:** Second of the three MVP powers in the plan. Unlocks vertical level design and gives the phone player a tactile, time-pressured puzzle distinct from arithmetic.
- **Acceptance:** Phone spellbook shows Summon Platform as a second power (purple `#9a7aff`). Tapping it opens a 4-color Simon-Says memory puzzle (5 lights, 25s timer). On solve, a platform materializes at (770, 460) bridging a new pit chasm at x=660–880 and fades out after 5s. Astronaut falling into the chasm respawns. Wire-protocol `summon-platform` round-trips cleanly.
- **Size:** M
- **Added:** 2026-05-12
- **Started:** 2026-05-12
- **Completed:** 2026-05-12
- **Note:** Shipped puzzle is Tap Sequence (memory) rather than the originally proposed Mini-Sudoku. Tap Sequence's time pressure pairs with the platform's 5-second decay; a calm logic puzzle would have been a stress mismatch.
