---
name: new-planet
description: Scaffold a new planet across all sides of Constellation's planet contract — the planetN.ts config implementing PlanetConfig, a colocated planetN.test.ts cloned from the planet3 template (geometry budget + progression-chain assertions), and the ordered PLANETS entry in registry.ts (array order = progression). Use when adding a planet (e.g. "add a fourth planet", "new ICE-storm level"), after the planet's name + gate layout are decided.
---

# new-planet — scaffold a planet end-to-end

Constellation planets have a **multi-sided contract**. Miss a side and the level never appears, ships untested, or breaks the unlock chain. This skill walks every side in dependency order. Model the new planet on **`planet3.ts` ("Nebula Core")** — the richest example, with both opt-in `theme` and `hazardLane` — and clone **`planet3.test.ts`** for the colocated tests.

> Assumes the planet is already designed: you know its **id** (`planet-N`, the next index), a **name** + **hint**, the **gate layout** left→right (which powers gate it, where the pit/corridor/curtain/finale sit), and — optionally — a **palette theme** and a **Phase Dash hazard lane**. If not, decide those first (per the global "New Feature Mode": describe it, why, how it fits — then scaffold).

## The contract — every side, in order

Work from the data file outward. After each step, `npm run typecheck` (a project hook may run it for you).

### 1. Planet config — `src/game/planets/planetN.ts`
Clone `planet3.ts`. Keep its `import type { PlanetConfig } from './planet1';` and its derived-constant style (named `SPAWN_X`, `CORRIDOR_X`, `HAZARD_*`, `HIDDEN_PLATFORM_*`, `GOAL_*` consts feeding the config, each with a comment justifying the number against the reach budget). Export `planetNConfig: PlanetConfig` with **every required field**:

```ts
export const planetNConfig: PlanetConfig = {
  id: 'planet-N',                                  // matches the registry id
  name: '<Name>',                                  // user-visible title
  hint: '<one-line subtitle>',                     // what to do, left→right
  spawn: { x: SPAWN_X, y: SPAWN_Y },
  goal: { x: GOAL_X, y: GOAL_Y },
  pit: { startX: <n>, endX: <n> },                 // startX === endX → continuous ground (degenerate)
  corridor: { x: CORRIDOR_X },                     // Freeze Stars sentry lane
  platformDrop: { x: <n>, y: <n> },                // where Summon Platform lands a ledge
  hiddenPlatform: { x: HIDDEN_PLATFORM_X, y: HIDDEN_PLATFORM_Y },
  darkZone: { x: <n>, y: <n>, width: <n>, height: <n> },  // Illuminate reveals this
  fallRespawnY: 600,
};
```

Two **opt-in** fields (both shown in `planet3.ts`; omit either for the simpler look):
- `theme?: PlanetTheme` — `{ background: string /* "#hex" CSS bg */, ground, ceiling, platform, hiddenPlatform, enemy, goal /* all 0xRRGGBB fills */ }`. Omitting it (like `planet1Config`) keeps the default textures, so it renders pixel-identical to the original look.
- `hazardLane?: { x; y; width; height }` — a full-height Phase Dash "plasma curtain". Tallness (span top-to-ground), not width, is what blocks a jump-over. Omit (planet-1/2) for no curtain.

Geometry lives on a 960×540 canvas; ground surface ≈ y=500; a running jump covers ~245px horizontal / ~117px vertical. Keep every visible keypoint in-bounds and reachable.

### 2. Colocated test — `src/game/planets/planetN.test.ts`
Clone `planet3.test.ts`. It is pure data + pure logic only (no Phaser, no scene). Adapt three things:

- **Reach-budget constants** at the top — `GROUND_SURFACE_Y`, `SPRITE_HALF_H`, `JUMP_RISE`, `GROUND_JUMP_SPRITE_TOP`. These are shared across planets; keep them unless your astronaut tuning differs.
- **Geometry assertions** to your gate layout — the structure block (all required `PlanetConfig` fields present + typed), the theme block (drop it if your planet has no `theme`), the hazard-lane "full-height curtain" block (drop it if no `hazardLane`), the Illuminate finale reach math (goal MISSES a ground jump but is REACHED from the hidden platform), and the pit/degenerate-ground + in-canvas-bounds checks.
- **Progression chain** — assert the unlock links from the **prior** planet. Mirror `planet3.test.ts`'s `markPlanetComplete` chain, extending it one link:
  ```ts
  // completing planet-(N-1) unlocks planet-N, and completing planet-N records it
  const base = /* …chain markPlanetComplete from planet-1 up to planet-(N-1)… */;
  expect(base.unlockedPlanets).toContain('planet-N');
  const after = markPlanetComplete(base, 'planet-N');
  expect(after.completed['planet-N']).toBe(true);
  ```
  If your planet is the new **last** in the chain, also assert `PLANETS[PLANETS.length - 1].id === 'planet-N'` and `.config === planetNConfig` (as planet3 does), and that completing it triggers no further unlock / no throw.

### 3. Registry entry — `src/game/planets/registry.ts`  ← ORDER = PROGRESSION
Add the planet to the `PLANETS` array. **⚠️ ARRAY ORDER DEFINES PROGRESSION:** completing the planet at index N unlocks the planet at index N+1. Appending puts the new planet last in the unlock chain; inserting it mid-array reorders the chain. Treat the order as a design contract.

```ts
import { planetNConfig } from './planetN';   // add alongside the others
// …
export const PLANETS: readonly PlanetRegistryEntry[] = [
  // …existing entries…
  { id: 'planet-N', label: '<Name>', config: planetNConfig },
];
```
`config` is optional — omit it to register a "Coming soon" stub the Hub shows but won't launch. Attaching `config` later is a drop-in.

### 4. Boot textures — `src/game/scenes/Boot.ts`  (usually no edit)
`BootScene.create()` **iterates `PLANETS`** and auto-generates `<key>-<id>` textures for every entry whose `config.theme` is set, at the default sizes. So a themed planet's textures are picked up **automatically — no Boot edit needed**. Only touch Boot if your planet introduces a **brand-new texture key** (a shape not in the default set: ground / ceiling / enemy / goal / platform / hidden-platform / spark) — then register it via `makeSolidTexture(...)` there, since textures must exist at preload, not at instantiation time.

## Finish
- `npm run typecheck && npm run test` must pass (the new colocated test runs under Vitest).
- `npm run build` must pass.
- Headless check: drive `?test=1` `window.__constellation` to confirm the planet launches and is winnable (see `docs/AUTONOMY.md` / `testBridge.ts`).
- Commit with the active milestone prefix, e.g. `feat(mX): planet-N "<Name>" with <gate layout> gates`.

## Gotchas
- The **registry order** is the only place progression lives — there's no separate unlock table. Append unless you deliberately want to re-thread the chain.
- A **degenerate pit** (`startX === endX`) skips no tiles → continuous ground. Use it when the planet gates on Phase Dash or Illuminate rather than Summon Platform (see planet-3's header).
- The hidden-platform collider **always exists**; the dark `Rectangle` only hides it until Illuminate fades it — so place `darkZone` over `hiddenPlatform` and make the goal reachable only from that platform (perceptually load-bearing Illuminate).
- Don't refactor the planet architecture — extend it, modeled on planet-3.
