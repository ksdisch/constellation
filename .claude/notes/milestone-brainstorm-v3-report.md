# Constellation — Next-Milestone Shortlist (Reconciled)

_Lead-synthesizer reconciliation of three independent scoring panels (impact-vision, autonomy-skeptic, pragmatist), re-verified against source. Date: 2026-06-05. Branch context: post-M5._
_Workflow: `constellation-milestone-brainstorm-v3` — 11 agents (2 recon · 5 idea generators · 3 critique+score panels · 1 synthesizer); 19 raw candidates → 5 shortlisted._

## TL;DR

**Top pick: the Juice milestone — procedural SFX + screen-shake, with particle bursts and a win-screen beat folded into one pass.**

It is the only candidate all three panels independently ranked #1 or #2, and source verification confirms why: it is the single biggest perceived-quality jump per line of code, it touches **zero protocol / zero deps / zero asset files**, and every effect is reachable from the existing test substrate through `getState()` — so it is **provable on localhost with zero human gates**, which the meta-goal weights heaviest. It does not deepen the two-player bond (its one real weakness), but it is the cleanest _significant_ advancement that ships this run without sequencing risk.

**Runner-up: Planet-3 + Phase Dash.** The meatier "real milestone" that closes both a content gap (planet-3 is a visible broken-promise dead-end) and a mechanical gap (planets are 3-power reskins), and is fully substrate-provable. It loses to Juice only on blast radius and one hard prereq.

The decisive cross-cutting finding (verified in source) is that **`?solo=1` bypasses the relay entirely and `send()` is a silent no-op without a socket** — so every game→phone feature cannot prove its phone-render half on today's substrate. That single fact reorders the whole field against the soul-features the impact-vision panel favored.

---

## Ground truth I re-verified (load-bearing for the ranking)

I read the actual source rather than taking panels on faith. Five facts decide the ranking:

1. **`?solo=1` bypasses the relay (`Boot.ts:44`).** Solo mode constructs a net client but deliberately never calls `net.connect()`. With **`client.ts:43`** guarding `send()` on `readyState === OPEN`, every game→phone `send()` in solo+test is a **silent no-op against no socket, no relay, no phone**. → The autonomy-skeptic panel is right and impact-vision over-claimed: **no game→phone candidate can prove its relay-forward + phone-render half on the existing substrate.** Provable: the pure projection/predicate function (Vitest), a send-spy that the game _tried_ to emit, all GAME-side effects via `getState()`. NOT provable: the phone received/rendered it — that needs a two-client `ws` harness **that does not exist** (confirmed: only four Vitest suites exist — `save`, `nodeStateFor`, `planet2`, `testBridge`).

2. **The relay forwards ONLY `cast-power` / `puzzle-solved` (`server.ts:92-93`),** both collapsed to one `power-cast` down-message. Any new message type needs a new opaque branch. Confirmed; no game logic in relay.

3. **`game-ready` is a declared type but NOT a live wire.** `protocol.ts:13` declares `game-ready { availablePowers }`, but it is referenced **nowhere in `src/` or `server/` except the type definition** — the game doesn't emit it and the phone doesn't consume it (only `power-cast` is wired phone-side). → Corrects the pragmatist/impact panels: the puzzle-variant candidate does **not** ride a free existing rail; it must stand up the emit+consume path and still crosses the relay, inheriting the un-provable-phone-render haircut. Its autonomy is weaker than two of three panels credited.

4. **The App.tsx silent-null trap is real but asymmetric.** The cast-FEEDBACK path is already `Record<PowerId, ...>` (`App.tsx:10`) and would fail to compile on a missing power. But the **puzzle router** (`renderPhase`, lines 138–146) is a bare if-chain ending in `return null` — a 4th `PowerId` compiles clean game-side (`castPower` has a `default: never` guard at `Planet.ts:215-217`) and **renders a blank puzzle screen on the phone.** Confirmed hard prereq for any 4th power: convert the puzzle router to `Record<PowerId, JSX> + satisfies` first.

5. **`save.ts` is `CURRENT_SCHEMA_VERSION = 1` with a documented `migrate()` version-switch seam,** and is the framework-free, already-unit-tested module — the meta-progression candidate's "perfect autonomy" claim is real. **`BridgeState` (`testBridge.ts`)** has exactly the fields panels claimed and no sfx/shake/phase/status fields — every "add one field for assertion" claim is honest.

---

## Reconciled ranked shortlist

| Rank | Milestone | Overall | Impact | Effort | Risk | Autonomy | Vision | Size |
|---|---|---|---|---|---|---|---|---|
| 1 | **Juice: SFX + shake (+particles +win-screen)** | **8.7** | 8 | 4 | 3 | 9 | 8 | M |
| 2 | **Planet-3 + Phase Dash (4th power)** | **8.2** | 9 | 7 | 6 | 8 | 7 | L |
| 3 | **Meta-progression spine (stats + Hub readout)** | **7.8** | 7 | 4 | 4 | 10 | 6 | M |
| 4 | **Starglow Presence (live game→phone HUD)** | **6.8** | 9 | 6 | 6 | 6 | 10 | M |
| 5 | **Planet-scoped puzzle variants** | **6.4** | 7 | 4 | 5 | 6 | 7 | M |

_Overall is a meta-goal-weighted reconciliation, not a raw mean: autonomy/provability and "significant (not a chore)" are up-weighted; pure vision is down-weighted when its proof needs a wall the substrate can't clear. Where panels' sub-scores diverged I adjudicate in each entry._

---

## 1. Juice: procedural SFX + screen-shake (particles + win-screen folded in) — **TOP PICK** (8.7, M)

**What.** A native-WebAudio synth (oscillator cues, no asset files, no dependency) plus `camera.shake`, wired into the cast/jump/freeze/death/win/goal hook points that already exist in `Planet.ts` and the entities. Particle bursts and a short win-screen celebration beat fold in as the same pass — all three panels independently merged them.

**Why.** Recon rates current game-feel "Zero." Sound + shake is the largest perceived-quality jump per line, and it makes the **existing three powers feel powerful** rather than adding a fourth thing to wire. It establishes a reusable audio/particle registry every future power and planet inherits free. It is the truest "hand it to a friend" lever.

**Scope.** Additive only. `AudioContext` singleton with a lazy resume-on-first-gesture gate; an injectable audio sink so Vitest asserts oscillator/cue math against a mock context; `camera.shake` calls; Boot-generated spark texture via the existing `makeSolidTexture` chokepoint; one-shot `explode()` emitters with `onComplete` teardown; a small win-screen sequence. **Touches no protocol, no relay, no deps, no `src/shared/`, and does not alter the Freeze Stars cast logic** — so the mandated smoke-test cannot regress.

**Prereqs (folded into the plan).**
- Extend `BridgeState` with `lastSfxCue`, `shakeActive`, and `lastBurst { kind, count }` for headless assertion.
- Injectable audio sink (mock `AudioContext`) as the Vitest target.
- Lazy resume gate wired into the existing keyboard/pointer handlers.
- Particle textures via `Boot.makeSolidTexture`; emitters are one-shot with teardown (leak guard).
- Win-screen sequence MUST reset any `timeScale`/physics dip on **every** exit path or the Hub/next planet inherits slowed physics (the one subtle regression trap).

**Autonomy proof (zero human gates).** Pure cue math (oscillator frequency/duration tables, burst count/spread/color) asserts in Vitest against the mock context. End-to-end: `?test=1` + `cast()`/input drive freeze/platform/death/win, and the driver reads `lastSfxCue` / `shakeActive` / `lastBurst` straight off `getState()`. **No wire, no phone, no relay, no external service.**

**Risks.** One genuine footgun, named by all three panels: the **autoplay-resume false-green** — a mock-context test passes while the real game is silent because the browser blocked the context until a gesture. Mitigation: also assert `context.state` transitions through a substrate path, not just the cue. Emitter leaks perturbing long headless drives → one-shot `explode()`. The win-screen `timeScale` teardown (above). All bounded and testable.

**Why it wins (vs. the runner-up).** Planet-3 is higher-_impact_ but it is an **L** that touches `protocol + Spellbook + App + Planet + Boot + PlanetConfig + BridgeState` in one change and is **gated on the App.tsx puzzle-router fix landing first**, with reach-math tuning that can soft-lock the lane. Juice is an **M** with the smallest blast radius in the pool, the best risk profile (3), equal-best autonomy, and it ships a thing a friend _feels_ on the very first play without any prerequisite refactor. Planet-3 is the better _second_ milestone precisely because Juice will already have built the SFX registry it can reuse.

---

## 2. Planet-3 "Nebula Core" + 4th power Phase Dash — **RUNNER-UP** (8.2, L)

**What.** Author the config-less `planet-3` stub into a real, playable level **and** add a genuinely new 4th power — a dash that phases the astronaut through a hazard lane — wired across all four power sides (`PowerId` in protocol, Spellbook tile, puzzle component, `castPower` case).

**Why.** Closes the single biggest **content** gap (planet-2 unlocks into a "coming soon" dead-end — a visible broken promise) **and** the biggest **mechanical** gap (every planet is a reskin of the same three powers). The real milestone isn't the data authoring; it's **proving the rigid `PlanetConfig` and the `castPower` exhaustiveness guard — both designed for exactly three powers — actually extend.** Most complete, most player-facing standalone in the pool, and highest impact (9).

**Scope.** Extend `PlanetConfig` with an **opt-in** `hazardLane` field, mirroring exactly how `theme?` was added so planet-1/2 render byte-identical (NOT the obstacle-composition refactor — cut across all panels as the highest refactor risk against "extend, don't refactor" and the load-bearing kill-floor / un-jumpable-pit semantics). Author the planet-3 layout/config. Wire phase-dash 4 ways. Add a `hazardLane` texture via `Boot.makeSolidTexture`.

**Prereqs (folded into the plan).**
- **HARD GATE, must land first:** convert the `App.tsx` puzzle router (`renderPhase`, lines 138–146) from the bare-if-chain `return null` to `Record<PowerId, JSX> + satisfies`, or the 4th power ships a **blank phone puzzle screen** (verified real). ~15 lines but load-bearing.
- Opt-in `hazardLane` on `PlanetConfig`; planet-1/2 unchanged.
- Add `phaseActive` to `BridgeState`.
- Tune dash distance vs. lane width with the same care planet-2's documented reach budget needed.

**Autonomy proof.** Best content-play proof in the pool, **all game-side**: dash reach-math is pure Vitest; the substrate drives the full loop — `startPlanet('planet-3')` → input-drive into the lane → assert `respawnCount` increments un-phased → `cast('phase-dash')` → assert `phaseActive === true` and `astronautX` advances past the lane without a respawn → assert `completed['planet-3']`. Zero external service, zero wire.

**Risks.** Largest blast radius in the shortlist (one change spans protocol + Spellbook + App + Planet + Boot + PlanetConfig + BridgeState). Reach-math mis-sizing can soft-lock the lane (same failure class as the planet-2 kill-floor fix). The App.tsx gate is non-negotiable and must precede the power.

**Panel adjudication.** Impact-vision scored this lower on _vision_fit_ (a 4th combat-utility power is incremental on the soul axis); autonomy-skeptic and pragmatist both scored it ~8 as the highest-impact provable content play. The **gesture-power alternative (Draw-a-Constellation, the prior v2 top-vision survivor at 9.33)** was merged out by all three panels: its raw pointer-draw interaction has **no substrate seam** (only the pure recognizer is Vitest-provable; the cast effect is assertable only by bypassing the draw via `cast()`), so it fails the zero-human-gate bar exactly where it matters. Revisit once a touch-input seam exists.

---

## 3. Meta-progression spine: per-planet stats + Hub journey readout (7.8, M)

**What.** Populate the empty-but-versioned save schema with per-planet `{ respawns, spellsCast, clearMs, best }`, recorded on win and surfaced as a star/stat line on Hub nodes — so the campaign reads as a journey with a record.

**Why.** Directly answers the recon-flagged "meta-progression is thin" gap, and carries the **single strongest autonomy story in the pool** — the autonomy-skeptic panel gave it a perfect 10. `save.ts` is already the framework-free, unit-tested module with a documented `migrate()` version-switch seam (verified: `CURRENT_SCHEMA_VERSION = 1`).

**Scope.** Add a `spellsCast` counter in `Planet.castPower` and a scene-start timestamp for `clearMs` (clock on `create`, **not** first input, or solo/test timings skew). Bump `CURRENT_SCHEMA_VERSION` to 2; add the `v1→v2` case to the existing `migrate()` switch. Hub gets a per-node stat/star line in the existing text-node style.

**Prereqs (folded into the plan).** Preserve `migrate()`'s never-throws / always-salvage contract; expose recorded stats on `BridgeState`; star-tier derivation as a pure function.

**Autonomy proof.** Almost entirely pure Vitest: `migrate(v1Blob) → v2 shape`, idempotent merge, never-mutates-input, star-tier math — all against the already-tested module. End-to-end via substrate: drive N respawns → finish → read stats off `getState()` → reload → assert persistence survived. Zero wire, zero phone, zero relay.

**Risks.** The migration is the only real hazard — a bad `v1→v2` normalize could wipe a real player's unlock chain — but `save.ts`'s salvage-always design plus the existing suite make it the most _testable_ risk in the set.

**Why #3 not higher.** Least visceral player-facing payoff (a stat line / star rating doesn't create the in-the-moment co-op feeling), and a star rating brushes toward the competitive framing that clashes with cozy co-op — so vision is capped at 6. It is the **safest credit** if a run wants a guaranteed-clean win, and pairs naturally as a rider on Planet-3 (a new planet wants a stat line).

---

## 4. Starglow Presence: live game→phone state HUD (6.8, M)

**What.** The first game→phone push: a throttled `game-status` channel feeding a slim live HUD above the Spellbook, so the phone player finally **sees** the astronaut's world move instead of pick→solve→static "Cast!".

**Why.** The impact-vision panel's #1, and on pure soul it deserves it: recon's central wound is the **phone player's blindness** and the absence of a shared tension channel. This is the foundational rail every later bond feature (reactive tension, pings, combos) reuses, so building it first compounds. Highest vision in the pool (10).

**Scope.** Add a `status` `ClientToServerMsg` the game emits + a `game-status` `ServerToClientMsg`, touching game + phone in the same commit (strict wire rule); a ~3-line opaque forward branch in `server.ts`; throttled change-gated emit in `Planet.update()` at ~5–10 Hz, only when a phone is linked; normalize `astronautX` game-side so `src/shared/` stays protocol-only; a palette-correct inline-style HUD persisting across phases.

**Prereqs (folded into the plan).** First new relay forward branch — the Freeze Stars smoke-test MUST pass after. Throttle/change-gate to avoid relay flooding.

**Autonomy proof — and why it drops two ranks.** The pure status-projection function and the phone reducer are Vitest-clean, and a send-spy proves the game _tried_ to emit. But the headline experience — _the HUD renders live state on the phone_ — crosses the relay, and **`?solo=1` never calls `net.connect()` (verified), so the send is a silent no-op with no phone receiving.** Proving the e2e render needs a **two-client `ws` harness that does not exist in the repo.** Under a meta-goal that **penalizes proof requiring a wall the substrate can't clear**, this drops below three fully game-side candidates despite the best vision score.

**Recommendation.** Build this _after_ the substrate gains a relay harness (or as a deliberate infra milestone that builds that harness first). It is genuinely the highest-ceiling soul lever; it just cannot be honestly closed end-to-end with zero gates today.

---

## 5. Planet-scoped puzzle variants via game-ready transport (6.4, M)

**What.** Add a `puzzleVariants` map to `PlanetConfig`, surface it down the `game-ready` payload, and spread it into puzzle props — same three components, planet-tuned difficulty/flavor. Kills the "all planets reuse the same 3 puzzles" gap.

**Why.** Cheapest content-per-line in the pool, and it leaves the cast effects in `Planet.ts` untouched, so it's structurally safe for the Freeze Stars smoke-test.

**Scope.** Extend `game-ready` with an optional `variants` field (protocol change → game + phone same commit; relay stays opaque). A pure `planetId → resolved params` helper is the Vitest target. **Critical (verified):** the three puzzles take **different** prop shapes — `QuickMath { totalSeconds, problemCount }`, `TapSequence { totalSeconds, sequenceLength }`, `Trivia { timerSeconds }` — so any variant transport must **map per-power, not assume a uniform shape.**

**Prereqs (folded into the plan).** Default resolution must preserve planet-1 behavior exactly or the smoke-test breaks. Confirm each puzzle exposes a difficulty prop with a default.

**Autonomy proof — and why it's #5.** The variant-resolution function is pure-Vitest provable and the game-side cast path is unchanged. **But the end-to-end "ICE params actually reached and rendered on the phone puzzle" claim crosses the relay** — and `game-ready` is **not even a live wire today** (referenced nowhere outside the protocol type), so this candidate must stand up the whole emit+consume path AND inherits the same solo-bypass haircut as Starglow. If shipped, it belongs as a **cheap rider on Planet-3**, not a standalone milestone.

---

## What I deliberately did NOT shortlist (panels agree)

- **Deploy / infra cluster** (configurable relay URL `VITE_RELAY_URL`, session reconnect, solo static deploy + CI, connection-failure UX + `/health`). The honest blocker: the public co-op artifact hits a **mixed-content wall** (an HTTPS page can't reach `ws://localhost`), so the only thing that ships is a **solo-only** build — the asymmetric co-op, the soul of the project, does not deploy this run. The relay-URL seam is a worthwhile ~20-minute rider whenever a real deploy is _scheduled_, not now.
- **PlanetConfig obstacle-composition refactor.** Highest refactor risk; brushes "extend, don't refactor" and the load-bearing kill-floor semantics. Folded into Planet-3 as an _implementation strategy_ only if the layout demands it.
- **Power Combos / overcharge.** Mechanically the most exciting, but it stacks **three risky firsts** in one change — first new relay-forwarded type + first inter-power coupling + the App.tsx fix — plus a stateful combo gate that must survive respawns/resets. Revisit as a follow-on once the status rail is proven.
- **Phone-side haptics / WebAudio.** On iPhone Safari, `navigator.vibrate` is silently ignored and autoplay-resume is stricter — not provable headlessly. Fold the pure pattern-selector tables into a later juice pass.

---

## Recommendation, stated plainly

**Build the Juice milestone now.** It is the cleanest significant advancement that satisfies the meta-goal without reservation: zero protocol, zero deps, zero asset files, smallest blast radius, best risk profile, and fully provable on localhost with zero human gates. Its honest weakness — it polishes the laptop, not the two-player bond — is real, but the bond features that score higher on vision (Starglow Presence above all) **cannot be honestly closed end-to-end today** because `?solo=1` bypasses the relay and no `ws` test harness exists. Ship Juice this run; it also builds the reusable SFX/particle registry that Planet-3 and every future power inherit.

**If a meatier "real milestone" is preferred over the safe high-ROI play, build Planet-3 + Phase Dash** — accept the L-size blast radius and land the App.tsx puzzle-router fix first.

**Then sequence the soul arc deliberately:** invest one milestone in a two-client `ws` test harness (the missing substrate piece), which unlocks Starglow Presence → reactive tension → co-presence ping as a compounding bond series — the highest-ceiling direction the project has, currently blocked only by an honest verification gap, not by vision.
