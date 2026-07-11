/**
 * Pure Quick Math problem generation (F-55) — framework-free so it's
 * Vitest-testable. The component (`QuickMath.tsx`) renders it; nothing here
 * imports React or touches the DOM.
 */

export type Op = '+' | '−' | '×';

export interface Problem {
  a: number;
  b: number;
  op: Op;
  answer: number;
}

/**
 * Default countdown length. The component uses it as its `totalSeconds`
 * default; App.tsx imports it to cap the reported `solveMs` at what the timer
 * actually allowed (F-50).
 */
export const QUICK_MATH_TOTAL_SECONDS = 30;

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function makeProblem(): Problem {
  const op: Op = (['+', '−', '×'] as const)[randInt(0, 2)];
  if (op === '+') {
    const a = randInt(8, 48);
    const b = randInt(8, 48);
    return { a, b, op, answer: a + b };
  }
  if (op === '−') {
    const a = randInt(20, 70);
    const b = randInt(5, a - 1);
    return { a, b, op, answer: a - b };
  }
  const a = randInt(3, 12);
  const b = randInt(3, 12);
  return { a, b, op, answer: a * b };
}
