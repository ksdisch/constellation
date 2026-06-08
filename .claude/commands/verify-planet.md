---
description: Headlessly verify a planet end-to-end via the pinned Playwright MCP and the ?test=1 bridge — boot, run the AUTONOMY.md playbook subset for that planet, emit per-step PASS/FAIL + an overall verdict. Pass a planet id (default planet-1).
argument-hint: [planet-1 | planet-2 | planet-3] (default planet-1)
---

Planet: ${ARGUMENTS:-planet-1}

Run the **headless verification playbook** for the planet above against the running game,
driven entirely by the project-pinned Playwright MCP (`mcp__playwright__*`) and the `?test=1`
bridge. This is a faithful, parameterized wrapper of the playbook in
[`docs/AUTONOMY.md`](../../docs/AUTONOMY.md) — **do not invent new bridge semantics.** Read that
file's "Bridge surface", "Load-bearing semantics", "Verification playbook", and "Known sharp edges"
sections if anything below is ambiguous; it is the source of truth.

## Prerequisites (state these, then check them)
- **Dev server running:** `npm run dev` (game on `:5180`). If a boot navigate fails, stop and say so —
  don't try to start it yourself.
- **Playwright MCP loaded:** the `.mcp.json` `playwright` server must be active in this session, so
  `mcp__playwright__*` tools exist. If they don't, stop and tell me to load `.mcp.json` (host-global
  browser MCPs are not a substitute — the pinned server is what makes this reproducible).

## Operating rules (from "Known sharp edges" — honor all of these)
- **Poll, never sleep.** Read `getState()` in a loop with `mcp__playwright__browser_wait_for` /
  `waitForFunction`; never assert after a fixed delay. Assert on `won` / state fields, **never pixels**.
- **Wait for the Planet scene.** Hub's `getState` is zeroed (`sceneKey: ''`); poll until
  `sceneKey === 'Planet'` before reading any scene field.
- **`input` is module-global.** Call `resetInput()` between maneuvers and before every scene
  restart, or a stuck `right` walks across restarts.
- **Re-cast the platform.** Summoned platforms fade after ~5s; if a maneuver stalls and
  `platformCount === 0`, re-cast `summon-platform`.
- **Driving live physics is the flake source.** Prefer the deterministic `input` seam over synthetic
  keystrokes. planet-1 is the most robust headless clear.

## 1. Boot (AUTONOMY.md playbook step 1)
- `mcp__playwright__browser_navigate` → `http://localhost:5180/?solo=1&test=1`.
- `waitForFunction(() => !!window.__constellation)`; assert the 6 bridge members exist
  (`enabled, input, resetInput, getState, cast, startPlanet`).
- **PASS/FAIL: Boot.**

## 2. Clean slate (step 2)
- `localStorage.removeItem('constellation:progress')`; reload; re-wait for the bridge.
- **PASS/FAIL: Clean slate.**

## 3. Positive clear (step 3)
- `startPlanet('${ARGUMENTS:-planet-1}')`; poll until `sceneKey === 'Planet'`.
- Drive `input.right = true`; cast the planet's load-bearing powers at the right beats:
  `cast('freeze-stars')` near the sentry, `cast('summon-platform')` at the pit (re-cast if
  `platformCount === 0`), `cast('illuminate')` near the hidden ledge; bunny-hop (`input.jump = true`)
  across. `resetInput()` between distinct maneuvers.
- Expect `won === true`, `completed['${ARGUMENTS:-planet-1}'] === true`, and the next planet present
  in `unlockedPlanets`.
- **PASS/FAIL: Positive clear.**

## 4. Negative tests (steps 4–5, 6b — run only what applies to this planet)
Pick the subset that matches the planet's load-bearing powers (see AUTONOMY.md "Load-bearing
semantics"). `resetInput()` + reload to a clean Planet between each negative run.
- **Omit Freeze (step 4)** — drive right only; expect `respawnCount` rises, `won` false,
  `astronautX` stuck before the corridor band.
- **Omit Platform (step 5)** — freeze past the sentry, then drive right with no platform; expect
  `respawnCount` rises (fall into the pit), `won` false. (Relies on the kill-floor fix.)
- **Phase Dash — planet-3 only (step 6b)** — *Negative:* keep the sentry frozen (re-cast every <3s),
  drive right; expect `respawnCount` rises and `astronautX` never crosses the curtain (max ≈ 555).
- **Do NOT run an "omit Illuminate" negative** — Illuminate is perceptual (its collider exists
  unconditionally); a blind driver wins without it.
- **PASS/FAIL** per applicable negative.

## 5. Perceptual / phase checks (steps 6, 6b — where applicable)
- **Illuminate (step 6)** — `cast('illuminate')`; assert `darkZonePresent` flips `true → false`.
  (Not an omit test.)
- **Phase Dash positive — planet-3 only (step 6b)** — near the curtain `cast('phase-dash')`; assert
  `phaseActive === true`; keep driving; expect `astronautX` passes the curtain with `respawnCount`
  unchanged. `lastSfxCue === 'phase'` / `lastBurst.kind === 'phase-dash'` are durable cast signals.
- **PASS/FAIL** per applicable check.

## 6. Reload durability (step 7)
- Hard reload; read `localStorage['constellation:progress']`; assert the completion + unlock from
  step 3 survived.
- **PASS/FAIL: Reload durability.**

## 7. Freeze regression (step 8)
- `cast('freeze-stars')`; poll and assert `enemyFrozen` goes `false → true → …(~3s)… → false`.
- **PASS/FAIL: Freeze regression.**

## 8. Juice assertions (step 9)
- After each `cast(id)` in this run, assert `lastSfxCue` and `lastBurst.kind` match the power.
- Drive a death (omit-freeze, walk into the sentry); assert `shakeActive === true`.
- On the positive clear, assert `lastSfxCue === 'win'`.
- `audioState` is **expected** to reach `'running'`, but silence is **not** a failure (perceptual) —
  report it, don't fail on it.
- **PASS/FAIL: Juice.**

## Verdict
- Print a compact per-step table (step → PASS/FAIL → one-line evidence from `getState()`, never
  pixels). Then an **overall verdict**: PASS only if every applicable step passed; otherwise FAIL,
  naming the first failing step and the state that contradicted the expectation.
- Note any steps **skipped** because they don't apply to this planet (e.g. Phase Dash off planet-3),
  and call out `audioState` if it never reached `'running'` (informational, not a failure).
- **Out of scope:** playbook step 10 (no-flag inertness — `?solo=1` without `test=1` ⇒ `window.__constellation === undefined`) is a global guarantee, not per-planet; it's covered by `src/game/testBridge.test.ts` (Vitest), so this command does not re-check it.
