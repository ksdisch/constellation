# M10 — The Planet That Knows You Two: telemetry + portrait wedge

**Branch:** `feat/m10-rhythm-portrait` · **Milestone prefix:** `feat(m10):`
**Vision:** [`docs/ideas/planet-that-knows-you-two.md`](../ideas/planet-that-knows-you-two.md)
**Backlog:** `[Exploration] The Planet That Knows You Two` in [`BACKLOG.md`](../../BACKLOG.md)

## Scope (the de-risked first cut)

Close the **telemetry gap** and make the pair's solve-rhythm **something you can see** —
*before* any procedural generation. Per the vision's "decisions locked":

1. **Schema v2** of `ProgressState` records per-role, per-clear timing behind the
   existing `migrate()` seam. Lossless: existing v1 saves upgrade, never throw, never wipe.
2. Captured at the **two real write sites**: `Planet.showWin()` (laptop clear time +
   respawns) and the phone puzzle solve path (a new `solveMs` wire field).
3. Surfaced as a **read-only end-of-planet "portrait" card** on the laptop win screen —
   the shared screen the co-located couple looks at together.

**Explicitly NOT in this cut** (vision §"out of scope"): no procedural generation, no
ML, no change to the laptop/phone/relay shape, no cross-couple sharing.

## Data flow

```
phone puzzle opens ──(stamp start)
phone solve ──> puzzle-solved{ powerId, boosted, solveMs }
                        │ relay rename (carries solveMs)
                        ▼
                power-cast{ powerId, boosted, solveMs }
                        │ Planet records {power, ms} into per-run buffer
laptop clears planet ──> showWin(): clearMs = scene-clock elapsed; respawns = respawnCount
                        ▼
        recordPlanetRun(state, planetId, { clearMs, respawns, solves })  [pure, save.ts]
                        ▼
        saveProgress(state)  +  buildPortrait(name, telemetry)  →  render card
```

The split that makes the portrait *feel like the pair*: **explore vs solve** =
`lastClearMs − lastSolveMs` (Starglow's solving time vs the astronaut's traversal time).

## Files (blast radius)

| File | Change |
|------|--------|
| `src/shared/protocol.ts` | `solveMs?: number` on `cast-power`, `puzzle-solved`, `power-cast` (M10 doc). |
| `server/relay.ts` | Carry `solveMs` through the `→ power-cast` rename. |
| `src/game/progression/save.ts` | Schema **v2**: `telemetry` field + `PlanetTelemetry`/`PowerSolveStat` types; `normalizeTelemetry` sanitizer (load-path robustness); lossless `migrate` v1→v2; pure `recordPlanetRun`. |
| `src/game/progression/portrait.ts` | **NEW** pure `formatDuration` + `buildPortrait`. |
| `src/game/scenes/Planet.ts` | Capture `planetStartTime` + `solveTimings`; record at `showWin`; render portrait card; reflow win overlay; bridge `telemetry` field. |
| `src/game/testBridge.ts` | `BridgeState.telemetry` (current planet) for headless assertion. |
| `src/phone/App.tsx` | Stamp puzzle start on `pickPower`; send measured `solveMs` on `onSolved`. |
| Tests | `save.test.ts` (+telemetry/recordPlanetRun/migrate v1→v2), `portrait.test.ts` (NEW), `relay.test.ts` (+solveMs), `scripts/smoke-relay.ts` (+solveMs round-trip). |
| Docs | `BACKLOG.md` (move item to Done), `docs/AUTONOMY.md` (M10 verify notes). |

## Invariants held

- **Never throws / never wipes** — load path sanitizes telemetry; migrate is lossless.
- **Solo / no-phone** degrades: `solveMs` absent → portrait shows clear time + respawns,
  and a "connect Starglow" line instead of the spell-rhythm split. Planet-1 (no theme)
  unaffected by gameplay.
- **Purity** — `recordPlanetRun`, `buildPortrait`, `formatDuration` are pure + Vitest-tested.
- **Gameplay byte-identical when un-instrumented** — `solveMs` is recorded only; nothing
  in `castPower` branches on it.

## Gates

`npm run typecheck` · `npm run build` · `npm run test` (Vitest) · `npm run smoke:relay`
· adversarial review subagent · headless `?solo=1&test=1` + two-client verify via the
Playwright MCP (bridge `telemetry` field asserted across a clear).
