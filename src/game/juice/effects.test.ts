import { describe, it, expect } from 'vitest';
import { EFFECTS, type JuiceEvent } from './effects';
import { CUES } from './audio';

/**
 * Pure EFFECTS-table contract. JuiceController is deliberately NOT instantiated
 * (it needs a live Phaser scene — exercised in the browser, not Vitest). Because
 * effects.ts imports Phaser as a type only, importing this table pulls no Phaser
 * runtime into jsdom.
 */

const EVENTS: JuiceEvent[] = [
  'jump',
  'freeze',
  'platform',
  'illuminate',
  'death',
  'win',
];

describe('EFFECTS table', () => {
  it('covers every juice event', () => {
    for (const e of EVENTS) expect(EFFECTS[e]).toBeDefined();
  });

  it('every event maps to a real cue in the CUES table', () => {
    for (const e of EVENTS) expect(CUES[EFFECTS[e].cue]).toBeDefined();
  });

  it('bursts have positive counts and in-range RGB colors', () => {
    for (const e of EVENTS) {
      const b = EFFECTS[e].burst;
      if (!b) continue;
      expect(b.count).toBeGreaterThan(0);
      expect(b.color).toBeGreaterThanOrEqual(0);
      expect(b.color).toBeLessThanOrEqual(0xffffff);
      expect(b.speed).toBeGreaterThan(0);
      expect(b.lifespan).toBeGreaterThan(0);
      expect(b.scale).toBeGreaterThan(0);
    }
  });

  it('shakes have positive duration and gentle intensity (cozy, not jarring)', () => {
    for (const e of EVENTS) {
      const s = EFFECTS[e].shake;
      if (!s) continue;
      expect(s.duration).toBeGreaterThan(0);
      expect(s.intensity).toBeGreaterThan(0);
      expect(s.intensity).toBeLessThanOrEqual(0.03);
    }
  });

  it('jump is audio-only (no shake, no burst) — it fires on every hop', () => {
    expect(EFFECTS.jump.shake).toBeUndefined();
    expect(EFFECTS.jump.burst).toBeUndefined();
  });
});
