# constellation — Project Backlog

Unprioritized list of features, improvements, refactors, and ideas for this project.
Pick items with the `project-backlog` skill in Claude Code.

**Item types:** Feature · Improvement · Refactor · Rebuild · Exploration · Bug

**How to add an item:** Under `## Open`, create a new `### [Type] Title` heading and fill in Why, Acceptance, Size, and Added.

**Deferred ideas:** Higher-level explorations not yet ready to pick live in [`docs/ideas/`](docs/ideas/).

---

## Open

### [Exploration] The Planet That Knows You Two — a galaxy grown from your shared rhythm
- **Why:** Grow each planet from a recorded portrait of how *this pair* plays (a generator emits the `PlanetConfig` + per-role difficulty from the dyad's solve-rhythm) so the galaxy becomes a keepsake of the relationship, not disposable hand-authored content. Bold bet that "this place is OURS" beats authored polish for an audience of two. See [`docs/ideas/planet-that-knows-you-two.md`](docs/ideas/planet-that-knows-you-two.md) for the full vision.
- **Acceptance:** Prototype the credible first step — schema-v2 per-role solve telemetry behind `save.ts`'s `migrate()` seam + a read-only end-of-planet "portrait" card — and judge whether the portrait *feels true* (the precondition that earns trust for any generation). No procedural generation in this first cut.
- **Size:** L
- **Added:** 2026-06-07
- **Note:** Surfaced by the `/moonshot` workflow (tethered run, boldness 5/5). Flips assumption ④ (hand-authored content); advances the open "session persistence" decision below; depends on the M2 "is it fun?" gate. Supersedes the accommodation half of [`docs/ideas/specialization.md`](docs/ideas/specialization.md).

### [Exploration] Playtest M2 with girlfriend — the "is it fun?" gate
- **Why:** The plan explicitly names this as the critical gate before any M3 work. The whole asymmetric premise lives or dies here. If the loop doesn't feel fun, the power-to-puzzle pairing or the asymmetry itself may need to change before more code gets written.
- **Acceptance:** Play one full session (handshake → spellbook → Quick Math → freeze → run past enemy → win). Write down: did the cast feel rewarding? Was the puzzle the right difficulty? Did the 3-second freeze feel tight or generous? Did the pairing feel meaningful or arbitrary?
- **Size:** S
- **Added:** 2026-05-12

### [Feature] Polish pass — remainder: music + camera feel
- **Why:** M5. The SFX/particles/screen-shake/win-beat slice shipped (see Done: "Juice layer"); what remains of the original polish pass is **background music** (Incompetech/OpenGameArt loops, different tracks on hub vs. levels) and **camera feel** (a camera that lerps to follow the astronaut instead of being static). Music likely needs a small audio-asset decision (the stack is otherwise asset-free); camera-follow is pure Phaser.
- **Acceptance:** Background music loops on the hub and during levels (different tracks). Camera lerps to follow the astronaut. Subjective bar: "feels juicy" — building on the existing SFX/particle/shake layer.
- **Size:** M
- **Added:** 2026-05-12
- **Note:** Narrowed 2026-06-05 after the SFX/particles/shake subset shipped on `feat/m5-juice`.

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

### [Feature] Galaxy hub scene with planet nodes
- **Why:** M4 in the plan. Connects multiple levels into a campaign arc and gives the project its cartoon-galaxy identity. Without it, each level is an island.
- **Acceptance:** New Phaser scene showing a starry galaxy map with planet nodes. Selecting a planet loads its level. At least one planet (the current corridor level, retitled) is reachable from the hub. Hub remembers which planets are unlocked (in-memory for now — persistence is a separate item).
- **Size:** L
- **Added:** 2026-05-12
- **Started:** 2026-05-14
- **Note:** Scoped as the M4 foundation orchestrator (`.claude/orchestrator-prompt.md`): Phase 1 refactors `Level.ts` → data-driven `Planet.ts` taking a `PlanetConfig`; Phase 2 adds `HubScene` with one playable planet node + two locked placeholders, plus a "Return to Hub" win-screen button alongside "Play again". Planet 2 (ice) and Planet 3 (library) are separate orchestrator runs on top. Unlock state is in-memory only; persistence is an M5 question.

---

## Done

### [Feature] Planet 3 "Nebula Core" + Phase Dash — the 4th power
- **Why:** M6. Closes the planet-2 → "Coming soon" dead-end (a visible broken promise) **and** the mechanical gap (every planet was a reskin of the same three powers). The real win is proving the rigid `PlanetConfig` + the `castPower` exhaustiveness guard — both designed for exactly three powers — actually extend to a fourth.
- **Acceptance:** Third playable, themed level (NEBULA palette) with a mechanic distinct from Planets 1 & 2 — a genuinely new 4th power, **Phase Dash**, not just a puzzle reskin. Phase Dash is wired all four sides (`PowerId`, Spellbook tile, `PhaseAlign` puzzle, `castPower` case), is physically load-bearing (a full-height "plasma curtain" hazard), and rides an opt-in `PlanetConfig.hazardLane?` field mirroring how `theme?` was added. Goes beyond the original "themed puzzle variant" ask.
- **Size:** L
- **Added:** 2026-05-12 (as "Planet 3 — library theme")
- **Completed:** 2026-06-05
- **Note:** Built by the `/autonomous-milestone` workflow (brainstorm v3 runner-up, 8.2). **Phase Dash** = a 2.5s phase-invulnerability *window* vs. the hazard lane (a calm walk-through, not a reaction — deliberately cozy/no-twitch) + a brief ~350ms dash speed-boost. The curtain is un-passable by *tallness* (a running jump can't clear it or rise above it), so there's no reach-math soft-lock. New `src/phone/components/puzzles/PhaseAlign.tsx` (rotate-the-dials-to-align — a new interaction class) + `src/game/planets/planet3.ts`. **Nebula Core deliberately gates on three powers** (Freeze → Phase → Illuminate), not four: a second un-jumpable obstacle (a ≥260px pit) won't fit 960px without unplayable spacing, so the pit is degenerate and Summon Platform is an optional flourish — each planet now emphasizes a different subset. Landed the **App.tsx puzzle-router exhaustiveness fix** first (the hard prereq — a 4th power would otherwise render a blank phone puzzle), and made Spellbook exhaustive too. Live-verified at `?solo=1&test=1` (Phase Dash load-bearing negative + positive, full planet-3 clear, Illuminate flip, Freeze regression, planet-1 clear) **and** via a two-client handshake (phone solves Phase Align → relay → game casts phase-dash). Adversarial multi-agent review (7 findings) addressed. Documented in `docs/AUTONOMY.md`.

### [Feature] Juice layer — procedural SFX + screen shake + particle bursts + win beat
- **Why:** M5. The first "show your friends" polish: the three powers cast in silence with no feedback beyond a text banner. This makes them *feel* powerful and turns the prototype tactile — the largest perceived-quality jump per line, with zero new dependency and zero asset files.
- **Acceptance:** Native-WebAudio synth cues on jump / freeze / platform / illuminate / death / win; palette-matched particle bursts on each cast + death + win; gentle screen shake on death and win; a win beat (mint burst + soft camera flash). No protocol/relay/dep changes; Freeze Stars cast logic untouched. Pure cue/effect tables unit-tested; every effect assertable headlessly via new `BridgeState` fields.
- **Size:** M
- **Added:** 2026-06-05
- **Completed:** 2026-06-05
- **Note:** Built by the `/autonomous-milestone` workflow (brainstorm v3 top pick, 8.7). New `src/game/juice/{audio,effects}.ts` — `audio.ts` is a pure, scene-free cue engine with an injectable `AudioSink` (lazy WebAudio default, mock for Vitest); `effects.ts` is a pure `EFFECTS` table + a `JuiceController` scene applier (camera shake + one-shot self-tearing particle emitter), with **Phaser imported as a type only** so the table stays Vitest-testable without pulling Phaser into jsdom. `BridgeState` gained `lastSfxCue / shakeActive / lastBurst / audioState`. Live-verified at `?solo=1&test=1`: each cue+burst fires, death sets `shakeActive`, a full planet-1 clear sets `winCue='win'` + unlocks planet-2, `audioState` reaches `'running'`, and `?solo=1` without `test=1` keeps the bridge undefined. **Audibility is perceptual** (autoplay-resume), documented in `docs/AUTONOMY.md`. Deliberately used a camera flash, not `timeScale` slow-mo, to avoid cross-scene physics-teardown. Remaining polish (music + camera-follow) is a trimmed Open item.

### [Feature] Autonomy Substrate — flag-gated test bridge + deterministic input seam + kill-floor fix
- **Why:** M5. The project's only integration gate was a human "is it fun?" playtest, which blocked autonomous verification of real gameplay. A `?test=1`-gated `window.__constellation` bridge makes the running game *assertable* by a browser driver (read scene state, cast powers, drive the astronaut, jump straight into any planet) — turning "drive the canvas and hope" into "read a boolean."
- **Acceptance:** New `src/game/testBridge.ts` exposes typed `getState/cast/startPlanet/input` only under `?test=1`; a complete no-op otherwise (asserted by a Vitest test that `window.__constellation` stays undefined). Astronaut gains a deterministic input seam (OR-ed into keyboard, inert in prod). Planet exposes `respawnCount` + bridge providers; Hub exposes `startPlanet`. Documented in `docs/AUTONOMY.md`.
- **Size:** M
- **Added:** 2026-06-05
- **Completed:** 2026-06-05
- **Note:** Built by the autonomous `substrate-planet2-build` workflow (plan → implement → self-gated typecheck/build/test → adversarial diff review → live browser verification). Also fixed a latent **kill-floor bug**: `setCollideWorldBounds(true)` clamped pit falls at y≈516 so `fallRespawnY=600` was unreachable (dead respawn code) — `Planet.create()` now sets `world.checkCollision.down = false` so a missed pit jump respawns. This made Summon Platform genuinely load-bearing. No protocol/server/dependency changes; phone untouched; planet-1 pixel-identical.

### [Feature] Planet 2 — "Stellar Winds" (ICE theme, registry drop-in)
- **Why:** M4/M5. First net-new playable content since M3 and the first proof the data-driven `PlanetConfig` + registry chain carries variety. Completing it durably unlocks planet-3.
- **Acceptance:** Second playable level with an ICE palette (cold-blue ground/ceiling/platform, slate background) keyed off an opt-in `PlanetConfig.theme`; a distinct layout (powers in a new order: bridge → freeze → illuminate) with an **un-jumpable 288px pit** so Summon Platform is physically required; wired into the registry as a one-line drop-in; Vitest structural + unlock-chain tests; browser-proven clear.
- **Size:** L
- **Added:** 2026-05-12
- **Completed:** 2026-06-05
- **Note:** Live-verified at `?solo=1&test=1`: ICE theme renders, planet-1 win durably unlocks planet-2 across reload, omit-platform now respawns (load-bearing). Reuses the existing three puzzles — a **themed puzzle variant** (e.g. snowflake-symbol math) remains a follow-up. Illuminate is *perceptually* (not physically) load-bearing by design, since the hidden-platform collider always exists.

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
