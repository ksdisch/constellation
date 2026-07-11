import { describe, expect, it } from 'vitest';
import { planet1Config } from './planet1';
import { PLANETS } from './registry';
import { defaultProgress, markPlanetComplete } from '../progression/save';

/**
 * Structural validity of planet1Config plus the original three-power gauntlet
 * contract and the persisted-progression links. Pure data + pure logic only —
 * no Phaser, no scene. (planet-1 predates the planet2/3 test template; this
 * suite back-fills it — F-57.)
 *
 * The geometry assertions encode planet-1's design:
 *   - the Freeze corridor comes FIRST: the sentry's full patrol band sits on
 *     solid ground between spawn and the pit;
 *   - the pit is UN-JUMPABLE, so Summon Platform is physically load-bearing.
 *     NOTE: planet-1's raw skip range (endX - startX = 220) is NARROWER than a
 *     running jump (~245px) — what actually blocks the crossing is the
 *     EDGE-to-EDGE gap between the surviving ground tiles (256px), because
 *     Planet.create() removes whole 64px tiles. So this suite reconstructs the
 *     tile row exactly the way Planet.create() does, instead of asserting on
 *     the raw skip width (planet2's >=260 shortcut is only honest when the
 *     skip bounds land on tile edges);
 *   - the summoned platform bridges that gap in two short hops;
 *   - the goal MISSES a ground jump but is REACHED from the hidden platform,
 *     and the dark zone fully covers that platform, so Illuminate is
 *     (perceptually) load-bearing;
 *   - all visible keypoints stay inside the 960×540 canvas.
 */

// Ground-tile grid, as built by Planet.create(): 64px-wide tiles CENTERED on
// x = 32 + 64k at y=520 (40 tall → top surface y≈500), skipped inside the pit.
const GRID_STEP = 64;
const GRID_BASE = 32;
const TILE_HALF_W = GRID_STEP / 2;
const GROUND_SURFACE_Y = 500;

// Shared astronaut reach budget (matches Astronaut.ts + the other planets).
const SPRITE_HALF_H = 24; // 48px sprite
const JUMP_RISE = 117; // ~ v²/2g for v=460, g=900
// Horizontal ground a full running jump covers: speed 240 × ~1.02s flight.
const RUN_JUMP_SPAN = 245;
// The highest the astronaut's SPRITE TOP reaches from a ground jump (≈335):
// stand center on ground (500-24) − rise (117) − half-height to the top (24).
const GROUND_JUMP_SPRITE_TOP = GROUND_SURFACE_Y - SPRITE_HALF_H - JUMP_RISE - SPRITE_HALF_H;

// Sprite geometry from Boot.ts's generated textures.
const GOAL_HALF = 14; // goal 28×28
const PLATFORM_HALF_W = 48; // summoned platform 96×14
const PLATFORM_HALF_H = 7;
const HIDDEN_PLATFORM_HALF_W = 60; // hidden platform 120×16
const HIDDEN_PLATFORM_HALF_H = 8;
// Planet.create() constructs the sentry with an explicit ±140 patrol range.
const PATROL_RANGE = 140;

/** Replicates Planet.create()'s skip test: a grid tile is a pit (no ground). */
function isPitTile(x: number, startX: number, endX: number): boolean {
  return x >= startX && x < endX;
}

/** Ground-tile center xs, reconstructed the way Planet.create() builds them. */
function groundTiles(startX: number, endX: number): number[] {
  const tiles: number[] = [];
  for (let x = GRID_BASE; x < 960; x += GRID_STEP) {
    if (isPitTile(x, startX, endX)) continue;
    tiles.push(x);
  }
  return tiles;
}

describe('planet1Config — structure', () => {
  it('has all required PlanetConfig fields, correctly typed', () => {
    const c = planet1Config;
    expect(c.id).toBe('planet-1');
    expect(typeof c.name).toBe('string');
    expect(c.name.length).toBeGreaterThan(0);
    expect(typeof c.hint).toBe('string');
    expect(c.hint.length).toBeGreaterThan(0);
    for (const n of [
      c.spawn.x, c.spawn.y, c.goal.x, c.goal.y,
      c.pit.startX, c.pit.endX, c.corridor.x,
      c.platformDrop.x, c.platformDrop.y,
      c.hiddenPlatform.x, c.hiddenPlatform.y,
      c.darkZone.x, c.darkZone.y, c.darkZone.width, c.darkZone.height,
      c.fallRespawnY,
    ]) {
      expect(typeof n).toBe('number');
    }
  });

  it('is the BASELINE look: no opt-in theme, puzzle theme, or hazard lane', () => {
    // planet-1 is the default-texture reference planet — Boot generates no
    // `<key>-planet-1` variants and the phone keeps the default puzzle skin.
    expect(planet1Config.theme).toBeUndefined();
    expect(planet1Config.puzzleTheme).toBeUndefined();
    expect(planet1Config.hazardLane).toBeUndefined();
  });
});

describe('planet1Config — Freeze corridor comes first', () => {
  it('keeps the sentry patrol band on solid ground between spawn and pit', () => {
    const c = planet1Config;
    // Spawn is OUTSIDE the patrol band (the player walks INTO the gauntlet)…
    expect(c.spawn.x).toBeLessThan(c.corridor.x - PATROL_RANGE);
    // …and the whole band ends before the pit begins, so the sentry patrols
    // solid ground and the freeze gate is met before the platform gate.
    expect(c.corridor.x + PATROL_RANGE).toBeLessThan(c.pit.startX);
  });
});

describe('planet1Config — Summon Platform pit gate', () => {
  const { startX, endX } = planet1Config.pit;
  const tiles = groundTiles(startX, endX);
  const lastLeft = Math.max(...tiles.filter((x) => x < startX));
  const firstRight = Math.min(...tiles.filter((x) => x >= endX));

  it('skips a real run of grid tiles, bracketed by ground on both sides', () => {
    const skipped: number[] = [];
    for (let x = GRID_BASE; x < 960; x += GRID_STEP) {
      if (isPitTile(x, startX, endX)) skipped.push(x);
    }
    expect(skipped.length).toBeGreaterThanOrEqual(2);
    // Math.max/min over an empty filter would be ±Infinity — guard the
    // bracketing tiles exist before the edge math below relies on them.
    expect(Number.isFinite(lastLeft)).toBe(true);
    expect(Number.isFinite(firstRight)).toBe(true);
  });

  it('tile-EDGE gap exceeds a running jump → the platform is physically required', () => {
    const gap = firstRight - TILE_HALF_W - (lastLeft + TILE_HALF_W); // 896-640 = 256
    expect(gap).toBeGreaterThan(RUN_JUMP_SPAN);
  });

  it('platformDrop bridges the gap in two crossable hops', () => {
    const d = planet1Config.platformDrop;
    const leftGroundEdge = lastLeft + TILE_HALF_W;
    const rightGroundEdge = firstRight - TILE_HALF_W;
    // The summoned platform lands strictly inside the physical gap…
    expect(d.x - PLATFORM_HALF_W).toBeGreaterThan(leftGroundEdge);
    expect(d.x + PLATFORM_HALF_W).toBeLessThan(rightGroundEdge);
    // …each hop (ground edge → platform edge → ground edge) fits one jump…
    expect(d.x - PLATFORM_HALF_W - leftGroundEdge).toBeLessThan(RUN_JUMP_SPAN);
    expect(rightGroundEdge - (d.x + PLATFORM_HALF_W)).toBeLessThan(RUN_JUMP_SPAN);
    // …and the landing rise onto the platform top stays under the jump rise.
    expect(GROUND_SURFACE_Y - (d.y - PLATFORM_HALF_H)).toBeLessThan(JUMP_RISE);
  });
});

describe('planet1Config — Illuminate finale reach math', () => {
  it('goal is UNREACHABLE from a ground jump (hidden platform required)', () => {
    const goalBottom = planet1Config.goal.y + GOAL_HALF;
    // The sprite top at the apex of a ground jump (≈335) is still BELOW the
    // goal bottom (larger y), so a ground jump misses.
    expect(GROUND_JUMP_SPRITE_TOP).toBeGreaterThan(goalBottom);
  });

  it('goal is REACHABLE from the hidden platform', () => {
    const platformTop = planet1Config.hiddenPlatform.y - HIDDEN_PLATFORM_HALF_H;
    const standCenter = platformTop - SPRITE_HALF_H;
    const apexCenter = standCenter - JUMP_RISE;
    const goalTop = planet1Config.goal.y - GOAL_HALF;
    // The astronaut rises ABOVE the goal from the platform, so it passes through.
    expect(apexCenter).toBeLessThan(goalTop);
    // …and the platform→goal step is within a running jump horizontally.
    expect(
      Math.abs(planet1Config.goal.x - planet1Config.hiddenPlatform.x),
    ).toBeLessThan(RUN_JUMP_SPAN);
  });

  it('dark zone fully covers the hidden platform (the reveal is load-bearing)', () => {
    const dz = planet1Config.darkZone;
    const hp = planet1Config.hiddenPlatform;
    expect(dz.x - dz.width / 2).toBeLessThanOrEqual(hp.x - HIDDEN_PLATFORM_HALF_W);
    expect(dz.x + dz.width / 2).toBeGreaterThanOrEqual(hp.x + HIDDEN_PLATFORM_HALF_W);
    expect(dz.y - dz.height / 2).toBeLessThanOrEqual(hp.y - HIDDEN_PLATFORM_HALF_H);
    expect(dz.y + dz.height / 2).toBeGreaterThanOrEqual(hp.y + HIDDEN_PLATFORM_HALF_H);
  });
});

describe('planet1Config — bounds', () => {
  it('keeps every visible keypoint inside the 960×540 canvas', () => {
    const c = planet1Config;
    for (const x of [
      c.spawn.x, c.goal.x, c.pit.startX, c.pit.endX,
      c.corridor.x, c.platformDrop.x, c.hiddenPlatform.x, c.darkZone.x,
    ]) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(960);
    }
    // fallRespawnY is intentionally BELOW the canvas (it's the fall threshold);
    // every other y must sit within the visible 0..540 band.
    expect(c.fallRespawnY).toBeGreaterThan(540);
    for (const y of [c.spawn.y, c.goal.y, c.platformDrop.y, c.hiddenPlatform.y, c.darkZone.y]) {
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(540);
    }
  });
});

describe('planet1 progression', () => {
  it('is the FIRST planet in the chain and is registered with a config', () => {
    const first = PLANETS[0];
    expect(first.id).toBe('planet-1');
    expect(first.config).toBe(planet1Config);
  });

  it('starts unlocked in a fresh save, with planet-2 still locked', () => {
    const fresh = defaultProgress();
    expect(fresh.unlockedPlanets).toContain('planet-1');
    expect(fresh.unlockedPlanets).not.toContain('planet-2');
    expect(fresh.completed['planet-1']).toBeUndefined();
  });

  it('completing planet-1 records it and unlocks planet-2', () => {
    const after = markPlanetComplete(defaultProgress(), 'planet-1');
    expect(after.completed['planet-1']).toBe(true);
    expect(after.unlockedPlanets).toContain('planet-2');
    // planet-1 stays unlocked (replays allowed).
    expect(after.unlockedPlanets).toContain('planet-1');
  });
});
