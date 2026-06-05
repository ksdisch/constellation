import { describe, expect, it } from 'vitest';
import { planet2Config } from './planet2';
import {
  defaultProgress,
  markPlanetComplete,
} from '../progression/save';

/**
 * Structural validity of planet2Config plus the persisted-progression unlock
 * link to planet-3. Pure data + pure logic only — no Phaser, no scene.
 *
 * The geometry assertions encode the design contract from the build spec:
 *   - the pit is UN-JUMPABLE (>= 260px) so Summon Platform is required;
 *   - ground tiles exist immediately on both sides of the pit on the
 *     x = 32 + 64k grid so the platform-crossing route is well-formed;
 *   - all keypoints stay inside the 960x540 canvas.
 */

const GRID_STEP = 64;
const GRID_BASE = 32;

/** True if `x` lands on the ground-tile grid: x = 32 + 64k for some integer k. */
function onGrid(x: number): boolean {
  return Number.isInteger((x - GRID_BASE) / GRID_STEP);
}

/** Replicates Planet.create()'s skip test: a grid tile is a pit (no ground). */
function isPitTile(x: number, startX: number, endX: number): boolean {
  return x >= startX && x < endX;
}

/**
 * Reconstruct the actual ground-tile x positions the way Planet.create() does:
 * walk the grid 32,96,... < 960 and keep tiles NOT inside the pit skip range.
 */
function groundTiles(startX: number, endX: number): number[] {
  const tiles: number[] = [];
  for (let x = GRID_BASE; x < 960; x += GRID_STEP) {
    if (isPitTile(x, startX, endX)) continue;
    tiles.push(x);
  }
  return tiles;
}

describe('planet2Config — structure', () => {
  it('has all required PlanetConfig fields, correctly typed', () => {
    const c = planet2Config;
    expect(c.id).toBe('planet-2');
    expect(typeof c.name).toBe('string');
    expect(c.name.length).toBeGreaterThan(0);
    expect(typeof c.hint).toBe('string');
    expect(c.hint.length).toBeGreaterThan(0);

    expect(typeof c.spawn.x).toBe('number');
    expect(typeof c.spawn.y).toBe('number');
    expect(typeof c.goal.x).toBe('number');
    expect(typeof c.goal.y).toBe('number');
    expect(typeof c.pit.startX).toBe('number');
    expect(typeof c.pit.endX).toBe('number');
    expect(typeof c.corridor.x).toBe('number');
    expect(typeof c.platformDrop.x).toBe('number');
    expect(typeof c.platformDrop.y).toBe('number');
    expect(typeof c.hiddenPlatform.x).toBe('number');
    expect(typeof c.hiddenPlatform.y).toBe('number');
    expect(typeof c.darkZone.x).toBe('number');
    expect(typeof c.darkZone.y).toBe('number');
    expect(typeof c.darkZone.width).toBe('number');
    expect(typeof c.darkZone.height).toBe('number');
    expect(typeof c.fallRespawnY).toBe('number');
  });

  it('carries a fully-typed ICE theme', () => {
    const t = planet2Config.theme;
    expect(t).toBeDefined();
    if (!t) return; // narrow for TS; the assertion above is the real guard.
    expect(typeof t.background).toBe('string');
    expect(t.background.startsWith('#')).toBe(true);
    for (const fill of [t.ground, t.ceiling, t.platform, t.hiddenPlatform, t.enemy, t.goal]) {
      expect(typeof fill).toBe('number');
      expect(fill).toBeGreaterThanOrEqual(0);
      expect(fill).toBeLessThanOrEqual(0xffffff);
    }
  });

  it('pit is at least 260px wide → un-jumpable (Summon Platform load-bearing)', () => {
    const width = planet2Config.pit.endX - planet2Config.pit.startX;
    expect(width).toBeGreaterThanOrEqual(260);
  });

  it('keeps every keypoint inside the 960x540 canvas', () => {
    const c = planet2Config;
    const xs = [
      c.spawn.x,
      c.goal.x,
      c.pit.startX,
      c.pit.endX,
      c.corridor.x,
      c.platformDrop.x,
      c.hiddenPlatform.x,
      c.darkZone.x,
    ];
    const ys = [
      c.spawn.y,
      c.goal.y,
      c.platformDrop.y,
      c.hiddenPlatform.y,
      c.darkZone.y,
      c.fallRespawnY,
    ];
    for (const x of xs) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(960);
    }
    // fallRespawnY is intentionally below the canvas (a fall threshold); all
    // other y's must sit within the visible 0..540 band.
    for (const y of [c.spawn.y, c.goal.y, c.platformDrop.y, c.hiddenPlatform.y, c.darkZone.y]) {
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(540);
    }
    void ys;
  });

  it('has ground tiles immediately left and right of the pit on the 32+64k grid', () => {
    const { startX, endX } = planet2Config.pit;
    const tiles = groundTiles(startX, endX);

    // Last ground tile strictly left of the pit, and first strictly right of it.
    const leftTiles = tiles.filter((x) => x < startX);
    const rightTiles = tiles.filter((x) => x >= endX);
    expect(leftTiles.length).toBeGreaterThan(0);
    expect(rightTiles.length).toBeGreaterThan(0);

    const lastLeft = Math.max(...leftTiles);
    const firstRight = Math.min(...rightTiles);

    // Both are real grid tiles that bracket the pit, and neither is a pit tile.
    expect(onGrid(lastLeft)).toBe(true);
    expect(onGrid(firstRight)).toBe(true);
    expect(isPitTile(lastLeft, startX, endX)).toBe(false);
    expect(isPitTile(firstRight, startX, endX)).toBe(false);
    expect(lastLeft).toBeLessThan(startX);
    expect(firstRight).toBeGreaterThanOrEqual(endX);
  });

  it('skips a contiguous, non-empty run of grid tiles for the pit', () => {
    const { startX, endX } = planet2Config.pit;
    const skipped: number[] = [];
    for (let x = GRID_BASE; x < 960; x += GRID_STEP) {
      if (isPitTile(x, startX, endX)) skipped.push(x);
    }
    // At least a couple of tiles are removed → there really is a gap.
    expect(skipped.length).toBeGreaterThanOrEqual(2);
  });
});

describe('planet2 progression — unlocks planet-3', () => {
  it('completing planet-2 unlocks planet-3 via the shared save logic', () => {
    // Reuse the real persistence logic (no duplication): from a state where
    // planet-2 is unlocked, completing it must unlock planet-3.
    const base = defaultProgress();
    const withP2Unlocked = markPlanetComplete(base, 'planet-1'); // unlocks planet-2
    expect(withP2Unlocked.unlockedPlanets).toContain('planet-2');

    const afterP2 = markPlanetComplete(withP2Unlocked, 'planet-2');
    expect(afterP2.completed['planet-2']).toBe(true);
    expect(afterP2.unlockedPlanets).toContain('planet-3');
  });
});
