# Puzzle-and-Planet-Data-Model

## Purpose
Answers "what are the actual data schemas for planets, puzzles, talents, and progression — and how do they connect?" This exists entirely in code; no docs file describes the full model or the relationships between these types.

## Key understanding

### Planet configuration (`PlanetConfig`)

**Fact** ([`src/game/planets/planet1.ts`](../src/game/planets/planet1.ts)): Every planet is defined by a `PlanetConfig` with these fields:

| Field | Type | Purpose |
|---|---|---|
| `id` | `string` | Registry key (e.g. `'planet-1'`) |
| `name` / `hint` | `string` | UI display strings |
| `spawn`, `goal` | `{x,y}` | Astronaut start and win-tile world coords |
| `pit` | `{startX, endX}` | X range of the chasm (for Summon Platform) |
| `corridor` | `{x}` | Enemy patrol corridor X (for Freeze Stars) |
| `platformDrop` | `{x,y}` | Where a summoned platform materializes |
| `hiddenPlatform` | `{x,y}` | The platform Illuminate reveals |
| `darkZone` | `{x,y,width,height}` | The rectangle Illuminate fades out |
| `fallRespawnY` | `number` | Y threshold below which the astronaut respawns |
| `theme?` | `PlanetTheme` | **Opt-in** visual theme (background CSS + 6 texture fill colors) |
| `puzzleTheme?` | `PuzzleTheme` | **Opt-in** phone puzzle palette (`'default'|'ice'|'nebula'`) |
| `hazardLane?` | `{x,y,width,height}` | **Opt-in** Phase Dash plasma curtain |

**Fact** ([`src/game/planets/planet1.ts`](../src/game/planets/planet1.ts)): All three opt-in fields default to inert behavior: omitting `theme` → default textures; omitting `puzzleTheme` → phone renders as pre-M9; omitting `hazardLane` → no curtain (planets 1/2).

**Fact** ([`src/game/planets/registry.ts`](../src/game/planets/registry.ts)): Planets live in the ordered `PLANETS` array. Array order defines the unlock chain — completing planet at index N unlocks planet at index N+1. A `PlanetRegistryEntry` without a `config` field renders as a "Coming soon" hub node; adding a config is a drop-in.

---

### Wire protocol types (`src/shared/protocol.ts`)

**Fact** ([`src/shared/protocol.ts`](../src/shared/protocol.ts)): The shared boundary contains exactly: `PowerId` (4 literals), `PuzzleTheme` (3 literals), `ClientToServerMsg` (6 union members), `ServerToClientMsg` (8 union members).

**Fact** ([`src/shared/protocol.ts`](../src/shared/protocol.ts)): Three message fields carry metadata that is recorded but never branched on by game logic:
- `boosted?: boolean` — strength talent boost; phone sets it, game picks longer duration
- `solveMs?: number` — phone player's puzzle solve time; game records it in telemetry only
- `theme: PuzzleTheme` — on `planet-started`; phone applies it as a cosmetic palette

**Fact** ([`src/shared/protocol.ts`](../src/shared/protocol.ts)): `peer-disconnected` is server-originated (never peer-forwarded) — it appears in `ServerToClientMsg` but has no `ClientToServerMsg` counterpart and no `relayForward` rule.

---

### Puzzle overrides and talent system

**Fact** ([`src/phone/talents/talents.ts`](../src/phone/talents/talents.ts)): 11 talent nodes in two kinds:
- **Accommodation** (8 nodes): self-directed — tune your own puzzle. Mapped to `PuzzleOverrides` deltas by `tuningFor(unlocked)`.
- **Strength** (3 nodes): partner-directed — boost your partner's power. Mapped to a `Set<PowerId>` by `strengthFor(unlocked)`.

**Fact** ([`src/phone/talents/talents.ts`](../src/phone/talents/talents.ts)): `PuzzleOverrides` shape:
```
{
  'freeze-stars':    { totalSeconds?, problemCount? }
  'summon-platform': { totalSeconds?, sequenceLength?, revealFirst? }
  'illuminate':      { timerSeconds?, forgiveMistakes? }
  'phase-dash':      { totalSeconds?, dialCount? }
}
```
All fields optional — unset fields fall back to the puzzle component's own defaults, so the overrides never duplicate baseline numbers.

**Fact** ([`src/phone/talents/talents.ts`](../src/phone/talents/talents.ts)): Illuminate has no strength node. Every strength node maps to a duration-based power; Illuminate's reveal is permanent and binary, with no duration axis to scale.

**Inference** (reading `talents.ts` + `m8-strength-talents-plan.md` together): The `kind: 'accommodation' | 'strength'` field on `TalentNode` is the discriminant that routes a node into `tuningFor` (accommodation) or `strengthFor` (strength). The two functions are symmetric pure mappings: both take `Iterable<TalentId>`, both ignore unknown / wrong-kind ids.

---

### Progression persistence (`ProgressState` + `PlanetTelemetry`)

**Fact** ([`src/game/progression/save.ts`](../src/game/progression/save.ts)): The game-side save shape (schema v2, key `constellation:progress`):
```
{
  schemaVersion: 2,
  unlockedPlanets: string[],       // ordered array, planet-1 always present
  completed: Record<string, boolean>,
  telemetry: Record<string, PlanetTelemetry>
}
```

**Fact** ([`src/game/progression/save.ts`](../src/game/progression/save.ts)): `PlanetTelemetry` per planet:
```
{
  attempts: number,        // clears recorded (bumped on every clear, not just first)
  lastClearMs: number,     // scene-clock elapsed of most recent clear
  bestClearMs: number,     // fastest clear seen
  lastRespawns: number,    // astronaut deaths in most recent clear
  lastSolveMs: number,     // sum of phone solve durations in most recent clear (0 if solo)
  solves: Partial<Record<PowerId, { count, totalMs, bestMs }>>
}
```

**Fact** ([`src/game/progression/save.ts`](../src/game/progression/save.ts)): `loadProgress()` and `saveProgress()` never throw. Load path: JSON.parse → shape guard (`isProgressShape`) → version check → `normalize()` or `migrate()`. A corrupt or missing save returns `defaultProgress()` silently. `normalizeTelemetry()` drops individual corrupt entries rather than failing the whole load.

**Fact** ([`src/game/progression/save.ts`](../src/game/progression/save.ts)): `markPlanetComplete` is pure and idempotent — it returns a new `ProgressState` without mutating the input. If called with an unknown `planetId`, only `completed` is updated (no unlock side-effect). `PLANETS.length === 0` is treated as a loud failure (throws) rather than a silent wrong answer — the only throw in the otherwise never-throw save layer.

---

### Phone-side talent persistence

**Fact** ([`src/phone/talents/save.ts`](../src/phone/talents/save.ts), referenced from `m7-talents-plan.md`): The phone-side save (key `constellation:talents`) is a versioned, never-throws twin of the game-side save. Shape: `{ schemaVersion, stardust: number, unlocked: TalentId[] }`. Stardust can't go below zero; load-time orphan pruning drops tier-2 ids whose prerequisites weren't also saved (guards against corrupt blobs).

---

### Portrait (`src/game/progression/portrait.ts`)

**Fact** ([`src/game/progression/portrait.ts`](../src/game/progression/portrait.ts)): `buildPortrait(planetName, telemetry)` → `Portrait { title, lines: PortraitLine[], footer }` — pure, no Phaser import. The signature line is the per-role split: `lastClearMs − lastSolveMs` (astronaut explore time) vs `lastSolveMs` (Starglow solve time). This only appears when `lastSolveMs > 0` — a solo clear shows "connect a phone to capture your shared rhythm" instead.

**Fact** ([`src/game/progression/portrait.ts`](../src/game/progression/portrait.ts)): `bestClearMs` uses a "0 is no sample" guard — `Math.min(prev.bestClearMs, clearMs)` is only applied when `prev.bestClearMs > 0`, preventing a corrupt-loaded 0 from pinning the best at 0 forever. The same guard appears in the per-power `bestMs` accumulator.

---

### The relay's allowlist (`server/relay.ts`)

**Fact** ([`server/relay.ts`](../server/relay.ts)): `relayForward(msg)` is the relay's complete peer-forwarding policy. It handles exactly 4 cases:
1. `cast-power` | `puzzle-solved` → `power-cast` (the historical rename), carrying `boosted` and `solveMs` through unchanged
2. `planet-complete` → `planet-complete`
3. `planet-started` → `planet-started` (theme unchanged)
4. Everything else → `null` (dropped)

**Fact** ([`server/relay.ts`](../server/relay.ts)): `parseClientMsg(raw)` is the shape guard that fires before `relayForward`. It returns `null` for `JSON.parse('null')` (and other non-object primitives) — the bug that would have caused the P0 relay crash (F-01 in the audit) before Phase 0 fixed it.

**Inference** (reading `relay.ts` + all plan docs): The allowlist has grown by exactly one rule per milestone that added a new message type: `planet-complete` (M8), `planet-started` (M9). The `cast-power`/`puzzle-solved` → `power-cast` rename predates M5 and has been stable since. New peer-forwarded message types always require a new `relayForward` rule; server-originated messages (`peer-disconnected`, `room-created`, etc.) never appear here.

## Sources
- [`src/game/planets/planet1.ts`](../src/game/planets/planet1.ts) (PlanetConfig / PlanetTheme types + planet-1 values)
- [`src/game/planets/registry.ts`](../src/game/planets/registry.ts)
- [`src/shared/protocol.ts`](../src/shared/protocol.ts)
- [`src/phone/talents/talents.ts`](../src/phone/talents/talents.ts)
- [`src/game/progression/save.ts`](../src/game/progression/save.ts)
- [`src/game/progression/portrait.ts`](../src/game/progression/portrait.ts)
- [`server/relay.ts`](../server/relay.ts)
- [`docs/m7-talents-plan.md`](../docs/m7-talents-plan.md)
- [`docs/m8-strength-talents-plan.md`](../docs/m8-strength-talents-plan.md)

## Uncertainties & contradictions

**Unresolved** — The phone-side save schema version number and exact shape are inferred from `m7-talents-plan.md` and BACKLOG notes; the actual `src/phone/talents/save.ts` source was not read for this review. If that file's schema changed after M8, the "twin of game-side save" characterization may be imprecise.

None identified as contradictions between sources as of this review.

## Related pages
- [Milestone-Feature-Map](Milestone-Feature-Map.md)
- [Deploy-And-Ops](Deploy-And-Ops.md)
- [History](History.md)

## Relevance to current work
The data model is stable post-M13. Any new planet (via the `new-planet` skill) is a drop-in: author a `PlanetConfig` and add it to the `PLANETS` array. Any new power (via `new-power`) requires wiring all four sides simultaneously — `PowerId` in `protocol.ts`, Spellbook tile, puzzle component, `castPower` switch — and a new `relayForward` rule if the power introduces a new peer-forwarded message type.

_Last reviewed: 2026-07-26_
