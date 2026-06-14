# Autonomous verification — the test bridge

Constellation has no human-free integration test by default: the stated gate is a "is it fun?"
playtest. This document describes the **flag-gated test bridge** that lets an automated browser
driver verify real gameplay (not just pure logic) with no human and no new dependency.

## TL;DR

Load the game with **`?test=1`** and a typed `window.__constellation` object appears, exposing
synthetic input, a scene-state snapshot, power casting, and planet navigation. Without the flag the
bridge is a **complete no-op** — `window.__constellation` is never created and the game behaves
exactly as in production (asserted by `src/game/testBridge.test.ts`). Combine with `?solo=1` to skip
the phone + relay entirely:

```
http://<host>:5180/?solo=1&test=1
```

> **Container networking:** if the browser runs in a container, `localhost` is the container, not the
> host. Use the LAN IP Vite prints as `Network:` (it is in Vite's `allowedHosts`); `host.docker.internal`
> returns 403. Do **not** relax `vite.config.ts` to work around this.

## Bridge surface (`window.__constellation`)

| Member | Type | Notes |
|---|---|---|
| `enabled` | `true` | Presence of the object is the in-test signal. |
| `input` | `{ left, right, jump }` (mutable) | OR-ed into real keyboard reads each frame by `Astronaut.update()`. Set fields directly; `jump` only fires when grounded. |
| `resetInput()` | `() => void` | Clears all three. The input singleton is **module-global**, so call this between maneuvers and scene restarts. |
| `getState()` | `() => BridgeState` | Flat snapshot — see below. **Only the Planet scene wires a live `getState`;** in Hub it returns a zeroed state (`sceneKey: ''`), so poll for `sceneKey === 'Planet'` first. |
| `cast(powerId)` | `'freeze-stars' \| 'summon-platform' \| 'illuminate' \| 'phase-dash'` | Routes through `Planet.castPower` (same path as keys 1/2/3/4 and the phone). |
| `startPlanet(id)` | `'planet-1' \| 'planet-2' \| 'planet-3' \| ...` | Jumps straight into a planet from Hub *or* Planet. Only launches registry entries that have a `config` (config-less stubs are no-ops). |

`BridgeState = { sceneKey, won, enemyFrozen, astronautX, astronautY, respawnCount, platformCount,
darkZonePresent, phaseActive, lastCastPower, lastCastBoosted, unlockedPlanets: string[],
completed: Record<string, boolean>, lastSfxCue, shakeActive, lastBurst, audioState, musicTrack, musicState,
telemetry: PlanetTelemetry | null }`.
`phaseActive` is `true` while a Phase Dash window is open (the astronaut is immune to the hazard lane).
`unlockedPlanets`/`completed`/`telemetry` are read fresh from `loadProgress()` (localStorage) on every call.

### Rhythm telemetry (M10)

`telemetry` is the current planet's `PlanetTelemetry` (or `null` before any recorded clear): `{ attempts,
lastClearMs, bestClearMs, lastRespawns, lastSolveMs, solves: Record<PowerId, {count,totalMs,bestMs}> }`. It
makes the "rhythm portrait" wedge assertable. A clear bumps `attempts`, records `lastClearMs`
(scene-clock elapsed), and — for a **two-client** run where the phone solved a puzzle — folds the phone's
measured `solveMs` into `solves[power]` and `lastSolveMs`. Verified live: a `?solo=1&test=1` planet-1 clear
records `lastSolveMs:0` + empty `solves` (the portrait shows the solo "connect a phone" degrade); a
two-client run (phone solves QuickMath) lands `solves['freeze-stars'].count===1` with `lastSolveMs>0`, and
`bestClearMs` keeps the min across clears. `solveMs` is **recorded-only** — no gameplay branches on it
(proven over a live socket by `npm run smoke:relay`), so an un-instrumented/solo cast is byte-identical.

### Strength-talent coupling (M8)

| Field | Type | Notes |
|---|---|---|
| `lastCastPower` | `string \| null` | The most recently cast power (`null` until the first cast; reset on scene `init`). |
| `lastCastBoosted` | `boolean` | Whether that cast arrived **strength-boosted** — i.e. the phone player invested the matching talent and the game ran the longer duration (`freeze 5s / platform 8s / phase 4s`) + amplified banner/burst. |

To assert the coupling end-to-end with a two-client `?test=1` run: invest a strength talent on the phone
(`Deep Freeze`), solve that puzzle, then poll the game bridge for `lastCastPower === 'freeze-stars' &&
lastCastBoosted === true`. The pure wire (phone `strengthFor` → relay `relayForward` → game branch) is
already covered by Vitest; the bridge fields are for the live magnitude check.

### Juice fields (SFX / shake / particles)

The last four fields make the M5 juice layer assertable:

| Field | Type | Notes |
|---|---|---|
| `lastSfxCue` | `string \| null` | The most recently **requested** sound cue (`'jump' \| 'freeze' \| 'platform' \| 'illuminate' \| 'death' \| 'win'`). Set even when audio is silent — see the perceptual caveat below. Module-global, so it persists across a scene restart (assert on transitions, not absolute freshness). |
| `shakeActive` | `boolean` | True while `cameras.main` is mid-shake. Fires on `death` and `win`. |
| `lastBurst` | `{ kind, count } \| null` | The most recent particle burst's event + particle count. |
| `audioState` | `string` | The WebAudio context state: `'unavailable'` (no sink yet), `'suspended'`, or `'running'`. |
| `musicTrack` | `string \| null` | The active ambient track: `'planet'` in a level, `'hub'` on the hub, `null` when stopped. Module-global like `lastSfxCue`. **Only the Planet scene wires `getState`,** so a bridge read always sees `'planet'` there; the hub track is covered by `music.test.ts`, not the bridge. |
| `musicState` | `string` | The music engine's WebAudio context state (`'unavailable' \| 'suspended' \| 'running'`). Same perceptual autoplay-resume caveat as `audioState`. |

**Audibility is perceptual, like Illuminate.** `lastSfxCue` proves the cue was *requested* and `audioState`
proves whether the context actually resumed — but whether a human *hears* it depends on the browser's
autoplay-resume gesture. So assert `lastSfxCue` flips on cast and (optionally) that `audioState` reaches
`'running'`; do **not** treat silence as a failure. The pure cue/effect tables are Vitest-asserted in
`src/game/juice/*.test.ts`.

## Load-bearing semantics (important for honest negative tests)

A power is "load-bearing" only if the level is genuinely uncompletable without it. Two of the three
are **physical** (a blind driver provably fails); one is **perceptual** (only a sighted human needs it):

| Power | Kind | How to prove it |
|---|---|---|
| **Freeze Stars** | physical | Omit it → the astronaut hits the patrolling sentry → `respawnCount` rises, `won` stays false, `astronautX` never passes the corridor band. |
| **Summon Platform** | physical | Omit it → the astronaut falls into the pit → `respawnCount` rises, `won` stays false. *(Relies on the kill-floor fix below — and on the pit being wider than a running jump, which is why planet-2's pit is 288px.)* |
| **Illuminate** | **perceptual** | The hidden-platform collider exists **unconditionally** in `Planet.create()`; Illuminate only fades the cosmetic dark `Rectangle`. A vision-less driver reaches the goal *without* casting it, so **do not** assert "omit → unwinnable." Instead assert `darkZonePresent` flips `true → false` on cast. |
| **Phase Dash** | physical | Only on planets with a `hazardLane` (planet-3). Omit it → the astronaut hits the full-height "plasma curtain" → `respawnCount` rises, `won` stays false, `astronautX` never crosses the curtain. Cast it → `phaseActive` flips `true` and `astronautX` advances past the curtain with **no** respawn. The curtain is un-passable by *tallness* (a running jump can't clear it or rise above it), so there is no reach-math soft-lock. On planet-3 the curtain sits past the sentry, so the negative test freezes the sentry first to isolate the curtain as the blocker. |

## Kill-floor fix (`Planet.create`)

`Astronaut` has `setCollideWorldBounds(true)`, and the physics world bounds equal the 960×540 canvas —
so a falling astronaut was clamped at y≈516 and **soft-locked** at the pit bottom instead of reaching
`fallRespawnY` (600, intentionally below the canvas). The fall-respawn branch was effectively dead code,
and Summon Platform was not actually load-bearing on either planet.

`Planet.create()` now sets `this.physics.world.checkCollision.down = false`, so the *ground tiles* are the
floor (not the world's bottom edge). A missed pit jump falls past `fallRespawnY` and the existing respawn
fires. Verified live: omitting the platform on planet-2 drives `respawnCount` 0→3 with the astronaut
reaching y=600, `won` staying false, `maxX` never crossing the pit.

## Verification playbook (driven browser, `?solo=1&test=1`)

1. **Boot** → navigate; `waitForFunction(() => !!window.__constellation)`; assert the 6 keys.
2. **Clean slate** → `localStorage.removeItem('constellation:progress')`, reload.
3. **Positive clear** → `startPlanet(id)`; poll `getState()`; set `input.right=true`; `cast('freeze-stars')` near the sentry, `cast('summon-platform')` (re-cast if `platformCount===0`, the platform expires after 5s), `cast('illuminate')` near the ledge; bunny-hop (`input.jump=true`) across; expect `won===true`, `completed[id]===true`, the next planet in `unlockedPlanets`.
4. **Negative — omit Freeze** → drive right only; expect `respawnCount` rises, `won` false, `astronautX` stuck before the corridor.
5. **Negative — omit Platform** → freeze past the sentry, then drive right with no platform; expect `respawnCount` rises (fall into the pit), `won` false.
6. **Illuminate (perceptual)** → assert `darkZonePresent` `true → false` on cast (not an omit test).
6b. **Phase Dash (planet-3)** → `startPlanet('planet-3')`. *Negative:* keep the sentry frozen (re-cast every <3s), drive right, expect `respawnCount` rises and `astronautX` never crosses the curtain (max ≈ 555). *Positive:* near the curtain `cast('phase-dash')`, assert `phaseActive === true`, keep driving, expect `astronautX` passes the curtain with `respawnCount` unchanged. A full clear then needs Illuminate + the hidden-ledge mount (fiddly headless; a controlled "stop drifting once elevated near the goal x, hop straight up" maneuver lands it). `lastSfxCue === 'phase'` / `lastBurst.kind === 'phase-dash'` are durable cast signals (survive the 2.5s window expiring).
7. **Reload durability** → hard reload; read `localStorage['constellation:progress']`; assert the completion + unlock survived.
8. **Freeze regression** → `cast('freeze-stars')`; assert `enemyFrozen` `false → true → …(3s)… → false`.
9. **Juice** → after each `cast(id)` assert `lastSfxCue` and `lastBurst.kind` match the power; drive a death
   (omit-freeze, walk into the sentry) and assert `shakeActive === true`; on a positive clear assert
   `lastSfxCue === 'win'`. `audioState` is expected to reach `'running'`; silence is not a failure (perceptual).
10. **No-flag inertness** → load `?solo=1` *without* `test=1`; assert `window.__constellation === undefined` and a canvas still exists.

## Known sharp edges

- **Hub `getState` is zeroed** — always wait for `sceneKey === 'Planet'` before reading scene fields.
- **`input` is module-global** — `resetInput()` between maneuvers, or a stuck `right` walks across restarts.
- **Platform lifetime** — summoned platforms fade after 5000ms; a slow driver must re-cast when `platformCount===0`.
- **Follow camera (M5)** — the planet camera now lerp-follows the astronaut horizontally (vertical is locked; `showWin()` recentres the frame for the end-card). `astronautX/Y` are **world** coords and are unaffected, but this is one more reason to assert on `won`/state, never on-screen pixels. The widened bounds are the *camera*'s only — physics world bounds (and thus reach-math) are unchanged.
- **Driving live physics is the flake source** — prefer the deterministic `input` seam over synthetic keystrokes, poll state rather than sleeping fixed times, and assert on `won`/state, not pixels. (Mounting a stepping-stone platform headlessly is genuinely fiddly; the simplest robust positive clear is planet-1.)
- The committed driver is an **MCP/Playwright playbook**, not a re-runnable in-repo suite (the stack is locked — no Playwright dependency). The durable, CI-able assertions live in Vitest (`*.test.ts`).
- **Pinned browser MCP** — the repo ships a `.mcp.json` with a project-scoped `playwright` server (run via `npx @playwright/mcp@latest`, so nothing lands in `package.json`). Sessions that load it expose `mcp__playwright__*` tools; drive this playbook against `http://localhost:5180/?solo=1&test=1`. This is what makes the playbook reproducible in cloud sessions and for collaborators (host-global browser MCPs like kapture / MCP_DOCKER are not). The `/verify-planet` command wraps the steps above into one invocation on top of it.
