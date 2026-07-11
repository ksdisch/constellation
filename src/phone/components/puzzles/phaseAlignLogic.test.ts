import { describe, expect, it } from 'vitest';
import { MISALIGNED, PHASE_ALIGN_TOTAL_SECONDS, randomMisaligned } from './phaseAlignLogic';

/**
 * Invariants of the Phase Align dial seeder (F-55): a dial must never start
 * aligned (0°) and must always land on a quarter-turn the +90° tap cycle can
 * bring back to zero.
 */

describe('MISALIGNED', () => {
  it('contains only non-zero quarter turns', () => {
    expect(MISALIGNED.length).toBeGreaterThan(0);
    for (const deg of MISALIGNED) {
      expect(deg % 90).toBe(0);
      expect(deg).toBeGreaterThan(0);
      expect(deg).toBeLessThan(360);
    }
  });
});

describe('randomMisaligned', () => {
  it('always returns a misaligned quarter turn, never 0', () => {
    for (let i = 0; i < 300; i++) {
      const deg = randomMisaligned();
      expect(MISALIGNED).toContain(deg);
      expect(deg).not.toBe(0);
    }
  });
});

describe('PHASE_ALIGN_TOTAL_SECONDS', () => {
  it('pins the default countdown the solveMs telemetry cap relies on (F-50)', () => {
    expect(PHASE_ALIGN_TOTAL_SECONDS).toBe(30);
  });
});
