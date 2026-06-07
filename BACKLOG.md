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

### [Feature] Deploy — push the relay + clients to a public host (the actual ship)
- **Why:** M5. The remaining account-bound finish: deploy readiness (container, health endpoint, env-driven relay URL, docs) shipped 2026-06-07 — see Done. What's left needs **your** Fly + itch.io accounts.
- **Acceptance:** `fly deploy` the relay (config is in-repo), build the clients with `VITE_RELAY_URL=wss://<app>.fly.dev`, upload `dist/` to itch.io. End-to-end: laptop on home wifi, phone on cellular, full co-op loop works. Step-by-step in `docs/DEPLOY.md`.
- **Size:** S (groundwork done; this is the credentialed finish)
- **Added:** 2026-05-12

---

## In Progress

_(nothing in flight)_

---

## Done

### [Feature] Themed puzzle variants — per-planet puzzle reskins (M9)
- **Why:** Closes the Planet-2 "snowflake-symbol math" follow-up (noted in the Planet 2 entry below). Until now every phone puzzle looked identical regardless of which planet the laptop was on — the phone had zero planet awareness.
- **Acceptance:** Each planet's theme reaches the phone and reskins all four puzzles cozily — a themed glyph + accents (❄ ice / ✶ nebula) — while preserving each power's signature colour and leaving planet-1 (default) pixel-identical.
- **Size:** L
- **Added:** 2026-06-07
- **Completed:** 2026-06-07
- **Note:** Built by the `/autonomous-milestone` workflow. The crux was that per-planet theming needs a game→phone signal (the phone only knew which power was tapped), so it's a full vertical slice mirroring `planet-complete`: new shared `PuzzleTheme = 'default'|'ice'|'nebula'` + a `planet-started` message (both directions), a one-line `relayForward` rule, an opt-in `PlanetConfig.puzzleTheme?` (planet2 `'ice'`, planet3 `'nebula'`, planet1 omits → default), and `Planet.announceTheme()` sent on `create()` **and** on `phone-joined` (covers a late/rejoining phone; solo/no-phone is a harmless no-op). Phone side: a new pure `src/phone/puzzleThemes.ts` (`paletteFor`) whose **default palette is inert (empty glyph)** so every themed touch is gated and the baseline is unchanged; `App.tsx` tracks the theme and threads it through the uniform `PuzzleArgs` router (the `satisfies Record<PowerId,…>` guard still holds). Each puzzle applies the palette as a *layer* (glyph + label accent + one "hero" tint: the equation / grid glow / prompt-card border / instruction text) without overwriting the per-power colour. Gated on `typecheck` + `build` + **111 Vitest** (new `puzzleThemes.test.ts` + a `planet-started` relay case) + a `smoke:relay` extended to round-trip `planet-started` over a live socket. No browser-automation MCP in the cloud session, so React rendering is covered by typecheck/build per project convention; manual phone smoke remains the integration gate. **Deliberate cuts:** Spellbook tiles stay power-coloured (theming the between-puzzle menu was out of scope); puzzle *logic* (Simon colours, trivia questions, math) is untouched — the theme is purely cosmetic so it can't change difficulty.

### [Feature] Deploy readiness — env relay URL + relay container/health + deploy docs (M5)
- **Why:** M5 "the ship" groundwork. Two blockers stood between the prototype and a public host: both clients hardcoded `ws://<page-host>:3081` (wrong for a deployed client on a different host + TLS port), and the relay had no host config or HTTP health surface (a bare `WebSocketServer({ port })` serves no HTTP, so platform checks fail).
- **Acceptance:** Build-time `VITE_RELAY_URL` override on both net clients (unset → unchanged LAN inference, so `npm run dev` is byte-identical); relay now serves HTTP `/healthz` + the WS upgrade on one port (`node:http` + `WebSocketServer({ server })`) for TLS-terminated `http_service` hosting; `Dockerfile` + `.dockerignore` + `fly.toml` (force_https, health check) for the relay; `docs/DEPLOY.md` (relay→Fly, clients→itch.io, env wiring, e2e). The actual `fly deploy` / itch upload is account-bound and stays the user's step.
- **Size:** M
- **Added:** 2026-06-07
- **Completed:** 2026-06-07
- **Note:** Built by the `/autonomous-milestone` workflow. Relay forwarding logic untouched (the pure `relayForward()` + its 105-test suite unchanged); the only server change is wrapping the WS server in a `node:http` server that answers `GET /` and `/healthz` with `200 "constellation relay ok"` on the **same** port — exactly what a single-internal-port `http_service` wants. New `src/vite-env.d.ts` types `import.meta.env.VITE_RELAY_URL` (strict-safe, no `vite/client` pull-in). New `npm run start:relay` (the container CMD, honors `$PORT`) and `npm run smoke:relay` — a real-socket harness (`scripts/smoke-relay.ts`) that boots the actual relay and asserts health + the full create-room→join→**boosted** cast→`power-cast`→`planet-complete` round-trip. Verified: typecheck clean, 105 Vitest green, `smoke:relay` green, and a `VITE_RELAY_URL=…` production build bakes the URL into **both** bundles while a no-env build contains zero occurrences (LAN dev preserved). **Deliberate cuts:** relay-only container (clients are static, hosted separately); kept `tsx` as the runtime (locked-stack tool, no compile step); Cloudflare DO left as a noted non-goal (needs a different adapter).

### [Feature] Galaxy hub scene with planet nodes
- **Why:** M4 in the plan. Connects multiple levels into a campaign arc and gives the project its cartoon-galaxy identity. Without it, each level is an island.
- **Acceptance:** New Phaser scene showing a starry galaxy map with planet nodes. Selecting a planet loads its level. At least one planet (the current corridor level, retitled) is reachable from the hub. Hub remembers which planets are unlocked.
- **Size:** L
- **Added:** 2026-05-12
- **Started:** 2026-05-14
- **Completed:** 2026-06-05
- **Note:** Shipped: `src/game/scenes/Hub.ts` renders the starry node map, launches a planet on click (stub nodes show "Coming soon"), and reads unlock state from the durable `constellation:progress` localStorage save (`src/game/progression/save.ts`). Phase 1 refactored `Level.ts` → data-driven `Planet.ts` taking a `PlanetConfig`; "Return to Hub" + "Play again" both wired on the win screen. Unlock state, in-memory at first, became durable with the progression spine — which also resolved the session-persistence question (below).

### [Exploration] Decide on session persistence — save progress between sessions, or fresh each time?
- **Why:** Open question from the plan. Affects hub-unlock design, save-file format, and how playtests work.
- **Acceptance:** A decision on persist-or-not, what to persist, and where.
- **Size:** S
- **Added:** 2026-05-12
- **Completed:** 2026-06-06
- **Note:** Resolved as **persist, in `localStorage`, per device.** Two versioned, guarded, never-throw saves landed with the progression spine + talents: game-side `constellation:progress` (`{ schemaVersion, unlockedPlanets, completed }`, `src/game/progression/save.ts`) and phone-side `constellation:talents` (`{ schemaVersion, stardust, unlocked }`, `src/phone/talents/save.ts`). Both load on init and survive reload; schema-versioned with load-time orphan pruning. No server-side save (the relay stays stateless).

### [Feature] Strength talents — partner-directed power boosts, visible to both players (M8)
- **Why:** The deferred *strength* half of Player Specialization (`docs/ideas/specialization.md`). M7 shipped accommodation (phone-only "make MY puzzle cozier"); strength was held back because magnitude-coupling to the laptop risked level balance. It doesn't here — every boost is monotonically *more forgiving* for the astronaut — so this is now safe, and it finally makes talents **visible to both players**.
- **Acceptance:** A strength branch on the phone (3 nodes — Deep Freeze / Lasting Platform / Long Phase, one per duration-based power; Illuminate has none — a permanent binary reveal has no duration axis). Unlocking one boosts the **partner's** power on the laptop (freeze 3→5s, platform 5→8s, phase 2.5→4s) with an amplified banner + particle burst. Clearing a planet earns the phone +3 bonus stardust (the hub→economy loop). All wired across protocol + relay + game + phone in lockstep.
- **Size:** L
- **Added:** 2026-06-06
- **Completed:** 2026-06-06
- **Note:** Built by the `/autonomous-milestone` workflow. The framing asymmetry is the point: **accommodation tunes YOUR puzzle, strength boosts your PARTNER's power** — an altruistic investment the laptop player actually feels (a "For you"/"For partner" badge names it in the tree). `TalentNode` gained `kind`; new pure `strengthFor(unlocked) → Set<PowerId>`. The boost **rides the cast** (no separate loadout sync): `puzzle-solved`/`cast-power`/`power-cast` carry an optional `boosted`, the phone sets it from `strengthFor`, and the game owns the magnitudes. New `planet-complete` message (game→phone) drives the +3 earn + a transient phone toast. **Discovered + corrected** that the relay is an *allowlist*, not the "opaque pass-through" CLAUDE.md claimed — extracted the pure `server/relay.ts` `relayForward()` (now unit-tested) and fixed the doc. Gated on `typecheck` + `build` + **105 Vitest** (new `strengthFor`/`amplify`/`relayForward` tests) **and a real-socket relay smoke** proving the boosted cast + `planet-complete` round-trip through a live `ws` relay. Bridge gained `lastCastPower`/`lastCastBoosted` for a manual `?test=1` magnitude check. **Deliberate cuts:** no Illuminate strength node (no duration axis); no "harder puzzle for payoff" (collides with accommodation overrides for no gain — the stardust + opportunity cost is the cost); magnitude *is* the visibility (no separate cosmetic theming).

### [Feature] Player Specialization — phone-side talent constellation (M7, accommodation v1)
- **Why:** First meta-progression layer — the deferred `docs/ideas/specialization.md` idea, unblocked now that durable persistence (M4 spine) exists. Gives the puzzle player a personal sense of growth and finally makes the "constellation" name literal (a star-tree you draw as you invest).
- **Acceptance:** Phone earns **stardust** (★, +1 per puzzle solved, persisted in `localStorage`) and spends it in a new **Constellation** screen on accommodation talents that tune puzzles cozier — fewer math problems, longer timers, a free first Simon color, trivia that no longer resets on a wrong answer, fewer phase dials. 8 nodes / 4 puzzle branches / 2 tiers. Phone-side only (no power-magnitude coupling), no protocol/relay/game changes.
- **Size:** L
- **Added:** 2026-06-06
- **Completed:** 2026-06-06
- **Note:** Built by the `/autonomous-milestone` workflow. New `src/phone/talents/{talents,save}.ts` — a pure node table + `tuningFor()` (unlocked set → per-puzzle prop deltas) and a versioned, guarded, never-throws `localStorage` twin of the game-side progression save (earn/unlock/canUnlock; stardust can't go negative; prereq + affordability gated; load-time prune of orphaned tier-2 ids). New `TalentTree.tsx` screen + a Spellbook footer button; `App.tsx` holds talent state, earns on solve (guarded to the puzzle phase), and feeds `tuningFor()` into the puzzle router — kept uniform (`PuzzleArgs`) so the `satisfies Record<PowerId,…>` exhaustiveness guard still holds. The two new accommodations rode opt-in props (`TapSequence.revealFirst`, `Trivia.forgiveMistakes`), each defaulting to current behavior. **Deliberate scope cuts:** accommodation branch only (the strength branch needs laptop-side payoff coupling — out of the phone-only boundary) and earn-per-solve (per-planet earning would need a new `game→phone` wire message). Gated on `typecheck` + `build` + **90 Vitest tests** (29 new across `talents.test.ts` / `save.test.ts`); adversarial multi-agent review PASS, both MINOR findings folded in. No browser-automation MCP in the cloud session and the `?test=1` bridge is game-side only, so React wiring is covered by typecheck/build per project convention; manual phone smoke remains the integration gate.

### [Feature] Polish pass — remainder: camera feel + procedural music
- **Why:** M5. The SFX/particles/screen-shake/win-beat slice shipped (see "Juice layer"); this closes the rest of the original polish pass — **background music** (different tracks on hub vs. levels) and **camera feel** (a camera that lerps to follow the astronaut instead of being static).
- **Acceptance:** Ambient music loops on the hub and during levels (distinct tracks). Camera lerp-follows the astronaut. Subjective bar: "feels juicy" — building on the existing SFX/particle/shake layer.
- **Size:** M
- **Added:** 2026-05-12
- **Completed:** 2026-06-06
- **Note:** Built by the `/autonomous-milestone` workflow. **Music** sidesteps the "needs an audio-asset decision" snag by staying asset-free: new `src/game/juice/music.ts` is a structural twin of `audio.ts` — a pure `TRACKS` table (`hub` airy major-pentatonic, `planet` warmer minor-pentatonic) over an injectable `MusicSink` (lazy-WebAudio default with a lookahead scheduler + soft-envelope notes + sub-octave drone; mock sink for Vitest; jsdom-safe). `Hub.create()`→`startMusic('hub')`, `Planet.create()`→`startMusic('planet')`; idempotent per-track so a scene restart keeps the loop seamless and a hub↔planet transition self-switches. **Camera** lerp-follows the astronaut **horizontally only** — vertical is locked (camera-bounds height == world height) because levels were framed for a static vertical view. Crucially only the **camera** bounds widen (into seamless flat-colour side-margin); `physics.world` is untouched, so reach-math is byte-identical. Persistent HUD + cast banners are pinned with `setScrollFactor(0)`; `showWin()` `stopFollow()`s + recentres so the end-card overlay/buttons sit un-panned (no input-hit drift). New bridge fields `musicTrack`/`musicState`. No protocol/relay/dependency/asset changes; Freeze Stars cast logic untouched. Gated on `typecheck` + `build` + 61 Vitest tests (incl. new `music.test.ts`); live browser drive deferred (no browser-automation MCP in the cloud session) — the `?test=1` bridge fields are in place for a manual run per `docs/AUTONOMY.md`.

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
