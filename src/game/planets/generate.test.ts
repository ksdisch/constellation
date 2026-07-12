import { describe, expect, it } from 'vitest';
import { deriveProfile, generatePlanet, type RhythmProfile } from './generate';
import type { PlanetConfig } from './planet1';
import type { PlanetTelemetry, Telemetry } from '../progression/save';

/**
 * The safety proof for the "Planet That Knows You Two" generator spike.
 *
 * The crux claim is that `generatePlanet` can NEVER emit an unplayable planet —
 * "one bad planet ruins the evening" is the exact risk the vision doc names. So
 * this suite sweeps the whole input space (a grid of profiles + edge/extreme
 * values) and asserts every generated config satisfies the SAME reach-budget
 * invariants `planet3.test.ts` encodes for the hand-authored planet. Pure data +
 * pure logic only — no Phaser, no scene.
 */

// Shared astronaut reach budget (identical to planet3.test.ts / Astronaut.ts).
const GROUND_SURFACE_Y = 500;
const SPRITE_HALF_H = 24;
const JUMP_RISE = 117;
const GROUND_JUMP_SPRITE_TOP = GROUND_SURFACE_Y - SPRITE_HALF_H - JUMP_RISE - SPRITE_HALF_H; // 335
const CANVAS_W = 960;
const CANVAS_H = 540;

/**
 * Assert a generated config is structurally valid AND playable against the reach
 * budget — the same contract planet3.test.ts checks, applied to generator output.
 */
function assertPlayable(c: PlanetConfig): void {
  // Every required numeric field is a finite number.
  for (const n of [
    c.spawn.x, c.spawn.y, c.goal.x, c.goal.y,
    c.pit.startX, c.pit.endX, c.corridor.x,
    c.platformDrop.x, c.platformDrop.y,
    c.hiddenPlatform.x, c.hiddenPlatform.y,
    c.darkZone.x, c.darkZone.y, c.darkZone.width, c.darkZone.height,
    c.fallRespawnY,
  ]) {
    expect(Number.isFinite(n)).toBe(true);
  }
  expect(c.id.length).toBeGreaterThan(0);
  expect(c.name.length).toBeGreaterThan(0);
  expect(c.hint.length).toBeGreaterThan(0);

  // Every visible keypoint stays inside the 960×540 canvas.
  for (const x of [c.spawn.x, c.goal.x, c.corridor.x, c.platformDrop.x, c.hiddenPlatform.x, c.darkZone.x]) {
    expect(x).toBeGreaterThanOrEqual(0);
    expect(x).toBeLessThanOrEqual(CANVAS_W);
  }
  for (const y of [c.spawn.y, c.goal.y, c.platformDrop.y, c.hiddenPlatform.y, c.darkZone.y]) {
    expect(y).toBeGreaterThanOrEqual(0);
    expect(y).toBeLessThanOrEqual(CANVAS_H);
  }

  // The pit is degenerate (continuous ground) OR un-jumpable (≥260) — never a
  // half-width pit that would be a reach-math soft-lock.
  const pitWidth = c.pit.endX - c.pit.startX;
  expect(pitWidth === 0 || pitWidth >= 260).toBe(true);

  // The hazard lane is a FULL-HEIGHT plasma curtain: a genuine Phase Dash gate.
  const h = c.hazardLane;
  expect(h).toBeDefined();
  if (!h) return;
  expect(h.width).toBeGreaterThan(0);
  expect(h.y - h.height / 2).toBeLessThan(GROUND_JUMP_SPRITE_TOP); // can't be jumped over
  expect(h.y + h.height / 2).toBeGreaterThanOrEqual(GROUND_SURFACE_Y - 10); // can't be walked under
  expect(h.x - h.width / 2).toBeGreaterThanOrEqual(0); // in-canvas horizontally
  expect(h.x + h.width / 2).toBeLessThanOrEqual(CANVAS_W);

  // Illuminate finale reach math: the goal MISSES a ground jump (hidden ledge is
  // load-bearing) but IS reachable from the hidden platform.
  const goalBottom = c.goal.y + 14;
  expect(GROUND_JUMP_SPRITE_TOP).toBeGreaterThan(goalBottom); // ground jump misses
  const platformTop = c.hiddenPlatform.y - 8;
  const apexCenter = platformTop - SPRITE_HALF_H - JUMP_RISE;
  expect(apexCenter).toBeLessThan(c.goal.y - 14); // platform jump reaches
  expect(Math.abs(c.goal.x - c.hiddenPlatform.x)).toBeLessThan(245); // within a running jump
}

const SIGNALS = [0, 0.25, 0.5, 0.75, 1];
const EXTREME_SIGNALS = [-1, 2, NaN, Infinity, -Infinity];
const SEEDS = [0, 1, 2, 42, 1337, -5, 2147483647, -2147483648];

describe('generatePlanet — always emits a playable planet', () => {
  it('over a full grid of well-formed profiles × seeds', () => {
    let count = 0;
    for (const solveTendency of SIGNALS) {
      for (const forgiveness of SIGNALS) {
        for (const exploreTendency of SIGNALS) {
          for (const seed of SEEDS) {
            assertPlayable(generatePlanet({ solveTendency, forgiveness, exploreTendency, seed }));
            count += 1;
          }
        }
      }
    }
    expect(count).toBe(SIGNALS.length ** 3 * SEEDS.length);
  });

  it('even for out-of-range / non-finite profile signals (clamped defensively)', () => {
    for (const bad of EXTREME_SIGNALS) {
      // Each signal poisoned in turn, plus an all-poisoned profile.
      assertPlayable(generatePlanet({ solveTendency: bad, forgiveness: 0.5, exploreTendency: 0.5, seed: 7 }));
      assertPlayable(generatePlanet({ solveTendency: 0.5, forgiveness: bad, exploreTendency: 0.5, seed: 7 }));
      assertPlayable(generatePlanet({ solveTendency: 0.5, forgiveness: 0.5, exploreTendency: bad, seed: 7 }));
      assertPlayable(generatePlanet({ solveTendency: bad, forgiveness: bad, exploreTendency: bad, seed: bad }));
    }
  });

  it('uses the default id and is themeless (default textures, no Boot churn)', () => {
    const c = generatePlanet(deriveProfile({}));
    expect(c.id).toBe('planet-generated');
    expect(c.theme).toBeUndefined();
    expect(c.puzzleTheme).toBeUndefined();
    expect(c.hazardLane).toBeDefined();
  });

  it('honors an explicit id override', () => {
    expect(generatePlanet(deriveProfile({}), 'planet-xyz').id).toBe('planet-xyz');
  });
});

describe('generatePlanet — deterministic', () => {
  it('same profile → byte-identical config', () => {
    const profile: RhythmProfile = { solveTendency: 0.3, forgiveness: 0.8, exploreTendency: 0.6, seed: 12345 };
    expect(generatePlanet(profile)).toEqual(generatePlanet(profile));
  });

  it('different profiles → visibly different geometry', () => {
    const a = generatePlanet({ solveTendency: 0.1, forgiveness: 0.1, exploreTendency: 0.1, seed: 11 });
    const b = generatePlanet({ solveTendency: 0.9, forgiveness: 0.9, exploreTendency: 0.9, seed: 99 });
    // At least one gate has visibly moved.
    const moved =
      a.corridor.x !== b.corridor.x ||
      a.hazardLane!.x !== b.hazardLane!.x ||
      a.hiddenPlatform.x !== b.hiddenPlatform.x;
    expect(moved).toBe(true);
  });
});

// ── deriveProfile ────────────────────────────────────────────────────────────
function telemetryEntry(over: Partial<PlanetTelemetry> = {}): PlanetTelemetry {
  return {
    attempts: 1,
    lastClearMs: 60_000,
    bestClearMs: 60_000,
    lastRespawns: 0,
    lastSolveMs: 0,
    solves: {},
    ...over,
  };
}

describe('deriveProfile', () => {
  it('empty telemetry → neutral default profile, never throws', () => {
    const p = deriveProfile({});
    expect(p).toEqual({ solveTendency: 0.5, forgiveness: 0.5, exploreTendency: 0.5, seed: 1 });
  });

  it('never throws on corrupt / hostile telemetry, and still yields a playable planet', () => {
    // Deliberately malformed values sneaking past the type (as a save blob might).
    const corrupt = {
      'planet-1': {
        attempts: NaN,
        lastClearMs: -1,
        bestClearMs: 0,
        lastRespawns: Infinity,
        lastSolveMs: NaN,
        solves: { 'freeze-stars': { count: -3, totalMs: NaN, bestMs: -1 } },
      },
      'planet-2': null,
      junk: 'not an object',
    } as unknown as Telemetry;
    const p = deriveProfile(corrupt);
    for (const v of [p.solveTendency, p.forgiveness, p.exploreTendency]) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    expect(Number.isFinite(p.seed)).toBe(true);
    assertPlayable(generatePlanet(p));
  });

  it('a fast-solving pair reads as high solveTendency; a slow pair as low', () => {
    const fast = deriveProfile({
      'planet-1': telemetryEntry({ solves: { 'freeze-stars': { count: 3, totalMs: 6_000, bestMs: 1_800 } } }),
    });
    const slow = deriveProfile({
      'planet-1': telemetryEntry({ solves: { 'freeze-stars': { count: 3, totalMs: 33_000, bestMs: 9_000 } } }),
    });
    expect(fast.solveTendency).toBeGreaterThan(slow.solveTendency);
  });

  it('a pair that dies a lot reads as more forgiving geometry', () => {
    const calm = deriveProfile({ 'planet-1': telemetryEntry({ lastRespawns: 0 }) });
    const crash = deriveProfile({ 'planet-1': telemetryEntry({ lastRespawns: 8 }) });
    expect(crash.forgiveness).toBeGreaterThan(calm.forgiveness);
  });

  it('explore fraction is the clear-minus-solve ratio', () => {
    // 60s clear, 6s solving → 90% exploring.
    const p = deriveProfile({
      'planet-1': telemetryEntry({ lastClearMs: 60_000, lastSolveMs: 6_000 }),
    });
    expect(p.exploreTendency).toBeCloseTo(0.9, 5);
  });

  it('is deterministic — same telemetry → same seed', () => {
    const t: Telemetry = { 'planet-1': telemetryEntry({ attempts: 4, lastClearMs: 42_500 }) };
    expect(deriveProfile(t)).toEqual(deriveProfile(t));
  });
});
