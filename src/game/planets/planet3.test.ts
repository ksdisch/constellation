import { describe, expect, it } from 'vitest';
import { planet3Config } from './planet3';
import { planet2Config } from './planet2';
import { PLANETS } from './registry';
import { defaultProgress, markPlanetComplete } from '../progression/save';

/**
 * Structural validity of planet3Config plus the Phase Dash / Illuminate design
 * contract and the persisted-progression links. Pure data + pure logic only —
 * no Phaser, no scene.
 *
 * The geometry assertions encode the build spec:
 *   - the hazard lane is a FULL-HEIGHT plasma curtain (un-passable without Phase
 *     Dash — tallness, not width, is what blocks a jump-over);
 *   - the goal MISSES a ground jump but is REACHED from the hidden platform, so
 *     Illuminate is (perceptually) load-bearing;
 *   - the pit is degenerate (Nebula Core gates on Phase Dash, not Summon
 *     Platform), so the ground is continuous;
 *   - all visible keypoints stay inside the 960×540 canvas.
 */

// Shared astronaut reach budget (matches Astronaut.ts + the other planets).
const GROUND_SURFACE_Y = 500; // ground tile top
const SPRITE_HALF_H = 24; // 48px sprite
const JUMP_RISE = 117; // ~ v²/2g for v=460, g=900
// The highest the astronaut's SPRITE TOP reaches from a ground jump (≈335):
// stand center on ground (500-24) − rise (117) − half-height to the top (24).
// Use the sprite top, not the apex center, so reach checks are conservative and
// frame-consistent with the goal/curtain geometry.
const GROUND_JUMP_SPRITE_TOP = GROUND_SURFACE_Y - SPRITE_HALF_H - JUMP_RISE - SPRITE_HALF_H;

describe('planet3Config — structure', () => {
  it('has all required PlanetConfig fields, correctly typed', () => {
    const c = planet3Config;
    expect(c.id).toBe('planet-3');
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

  it('carries a fully-typed NEBULA theme', () => {
    const t = planet3Config.theme;
    expect(t).toBeDefined();
    if (!t) return;
    expect(typeof t.background).toBe('string');
    expect(t.background.startsWith('#')).toBe(true);
    for (const fill of [t.ground, t.ceiling, t.platform, t.hiddenPlatform, t.enemy, t.goal]) {
      expect(typeof fill).toBe('number');
      expect(fill).toBeGreaterThanOrEqual(0);
      expect(fill).toBeLessThanOrEqual(0xffffff);
    }
  });
});

describe('planet3Config — Phase Dash hazard lane', () => {
  it('defines a hazard lane', () => {
    expect(planet3Config.hazardLane).toBeDefined();
  });

  it('is a FULL-HEIGHT curtain: tall enough to block a jump-over and reach the ground', () => {
    const h = planet3Config.hazardLane;
    expect(h).toBeDefined();
    if (!h) return;
    expect(h.width).toBeGreaterThan(0);
    const top = h.y - h.height / 2;
    const bottom = h.y + h.height / 2;
    // The curtain top must be ABOVE the highest the sprite top can reach (smaller
    // y), so a running jump can never clear it overhead.
    expect(top).toBeLessThan(GROUND_JUMP_SPRITE_TOP);
    // …and reach down to the ground so it can't be walked under.
    expect(bottom).toBeGreaterThanOrEqual(GROUND_SURFACE_Y - 10);
  });

  it('keeps the curtain inside the canvas horizontally', () => {
    const h = planet3Config.hazardLane;
    if (!h) return;
    expect(h.x - h.width / 2).toBeGreaterThanOrEqual(0);
    expect(h.x + h.width / 2).toBeLessThanOrEqual(960);
  });
});

describe('planet3Config — Illuminate finale reach math', () => {
  it('goal is UNREACHABLE from a ground jump (Illuminate perceptually load-bearing)', () => {
    const goalBottom = planet3Config.goal.y + 14; // 28px goal sprite
    // The sprite top at the apex of a ground jump (≈335) is still BELOW the goal
    // bottom (larger y), so a ground jump misses — the hidden platform is required.
    expect(GROUND_JUMP_SPRITE_TOP).toBeGreaterThan(goalBottom);
  });

  it('goal is REACHABLE from the hidden platform', () => {
    const platformTop = planet3Config.hiddenPlatform.y - 8; // 16px platform sprite
    const standCenter = platformTop - SPRITE_HALF_H;
    const apexCenter = standCenter - JUMP_RISE;
    const goalTop = planet3Config.goal.y - 14;
    // The astronaut rises ABOVE the goal from the platform, so it passes through.
    expect(apexCenter).toBeLessThan(goalTop);
    // …and the platform→goal step is within a running jump horizontally.
    expect(Math.abs(planet3Config.goal.x - planet3Config.hiddenPlatform.x)).toBeLessThan(245);
  });
});

describe('planet3Config — ground + bounds', () => {
  it('has a degenerate pit (continuous ground; no Summon Platform gate)', () => {
    expect(planet3Config.pit.startX).toBe(planet3Config.pit.endX);
  });

  it('keeps every visible keypoint inside the 960×540 canvas', () => {
    const c = planet3Config;
    for (const x of [c.spawn.x, c.goal.x, c.corridor.x, c.platformDrop.x, c.hiddenPlatform.x, c.darkZone.x]) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(960);
    }
    for (const y of [c.spawn.y, c.goal.y, c.platformDrop.y, c.hiddenPlatform.y, c.darkZone.y]) {
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(540);
    }
  });
});

describe('planet3 progression', () => {
  it('is the last planet in the chain and is registered with a config', () => {
    const last = PLANETS[PLANETS.length - 1];
    expect(last.id).toBe('planet-3');
    expect(last.config).toBe(planet3Config);
  });

  it('completing planet-2 unlocks planet-3, and completing planet-3 records it', () => {
    const base = markPlanetComplete(defaultProgress(), 'planet-1'); // unlocks planet-2
    const afterP2 = markPlanetComplete(base, 'planet-2'); // unlocks planet-3
    expect(afterP2.unlockedPlanets).toContain('planet-3');

    const afterP3 = markPlanetComplete(afterP2, 'planet-3');
    expect(afterP3.completed['planet-3']).toBe(true);
    // Last in the chain → no further unlock, no throw.
    expect(afterP3.unlockedPlanets).toContain('planet-3');
  });

  it('does not disturb planet-2 (still un-jumpable pit, still themed)', () => {
    expect(planet2Config.pit.endX - planet2Config.pit.startX).toBeGreaterThanOrEqual(260);
    expect(planet2Config.theme).toBeDefined();
  });
});
