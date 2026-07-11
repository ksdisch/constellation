import { describe, expect, it } from 'vitest';
import { QUICK_MATH_TOTAL_SECONDS, makeProblem } from './quickMathLogic';

/**
 * Invariants of the Quick Math generator (F-55). Random output, deterministic
 * assertions: every sampled problem must respect its op's documented operand
 * ranges and carry a correct answer.
 */

const SAMPLES = 500;

describe('makeProblem', () => {
  it('always produces a known op with a correct answer', () => {
    for (let i = 0; i < SAMPLES; i++) {
      const p = makeProblem();
      expect(['+', '−', '×']).toContain(p.op);
      const expected = p.op === '+' ? p.a + p.b : p.op === '−' ? p.a - p.b : p.a * p.b;
      expect(p.answer).toBe(expected);
      expect(Number.isInteger(p.a)).toBe(true);
      expect(Number.isInteger(p.b)).toBe(true);
    }
  });

  it('keeps operands inside each op’s range (and subtraction strictly positive)', () => {
    for (let i = 0; i < SAMPLES; i++) {
      const p = makeProblem();
      if (p.op === '+') {
        expect(p.a).toBeGreaterThanOrEqual(8);
        expect(p.a).toBeLessThanOrEqual(48);
        expect(p.b).toBeGreaterThanOrEqual(8);
        expect(p.b).toBeLessThanOrEqual(48);
      } else if (p.op === '−') {
        expect(p.a).toBeGreaterThanOrEqual(20);
        expect(p.a).toBeLessThanOrEqual(70);
        expect(p.b).toBeGreaterThanOrEqual(5);
        expect(p.b).toBeLessThan(p.a);
        expect(p.answer).toBeGreaterThanOrEqual(1);
      } else {
        expect(p.a).toBeGreaterThanOrEqual(3);
        expect(p.a).toBeLessThanOrEqual(12);
        expect(p.b).toBeGreaterThanOrEqual(3);
        expect(p.b).toBeLessThanOrEqual(12);
      }
    }
  });
});

describe('QUICK_MATH_TOTAL_SECONDS', () => {
  it('pins the default countdown the solveMs telemetry cap relies on (F-50)', () => {
    expect(QUICK_MATH_TOTAL_SECONDS).toBe(30);
  });
});
